create or replace function public.app_public_attendance_dashboard()
returns jsonb
language sql
stable
security definer
set search_path to ''
as $function$
  with params as (
    select timezone('America/Sao_Paulo', now())::date as today
  ),
  calendar as (
    select
      p.today,
      make_date(extract(year from p.today)::int, 1, 1) as start_date,
      make_date(extract(year from p.today)::int, 12, 31) as end_date,
      count(*) filter (
        where extract(isodow from dates.day) between 1 and 5
          and dates.day::date <= p.today
      )::numeric as elapsed_weekdays,
      count(*) filter (
        where extract(isodow from dates.day) between 1 and 5
      )::numeric as total_weekdays
    from params p
    cross join lateral generate_series(
      make_date(extract(year from p.today)::int, 1, 1)::timestamp,
      make_date(extract(year from p.today)::int, 12, 31)::timestamp,
      interval '1 day'
    ) as dates(day)
    group by p.today
  ),
  school_config as (
    select
      greatest(
        coalesce(
          max(nullif(to_jsonb(s)->>'school_days_per_year', '')::numeric),
          max(nullif(to_jsonb(s)->>'days_per_year', '')::numeric),
          200::numeric
        ),
        1::numeric
      ) as school_days_per_year,
      greatest(
        coalesce(
          max(nullif(to_jsonb(s)->>'lessons_per_day', '')::numeric),
          9::numeric
        ),
        1::numeric
      ) as lessons_per_day
    from public.school_settings s
  ),
  active_students as (
    select s.class_id, count(*)::numeric as active_students
    from public.students s
    where coalesce(s.active, true) = true
    group by s.class_id
  ),
  absence_totals as (
    select
      a.class_id,
      coalesce(sum(a.quantity) filter (where a.status = 'ABSENT'), 0)::numeric as absences
    from public.attendance_records a
    cross join calendar cal
    where a.date between cal.start_date and cal.today
    group by a.class_id
  ),
  class_capacity as (
    select
      c.id,
      c.name,
      case when c.education_level = 'FUNDAMENTAL' then 'FUNDAMENTAL' else 'MEDIO' end as education_level,
      coalesce(s.active_students, 0)::numeric as active_students,
      coalesce(a.absences, 0)::numeric as absences,
      coalesce(s.active_students, 0)::numeric
        * cfg.school_days_per_year
        * cfg.lessons_per_day
        * cal.elapsed_weekdays
        / nullif(cal.total_weekdays, 0) as expected_lessons
    from public.classes c
    cross join calendar cal
    cross join school_config cfg
    left join active_students s on s.class_id = c.id
    left join absence_totals a on a.class_id = c.id
    where c.active = true
  ),
  class_metrics as (
    select
      id,
      name,
      education_level,
      active_students,
      absences,
      expected_lessons,
      greatest(expected_lessons - absences, 0)::numeric as estimated_presences,
      case
        when expected_lessons > 0
          then round(least(100::numeric, absences * 100 / nullif(expected_lessons, 0)), 1)
        else 0::numeric
      end as absence_percent,
      case
        when expected_lessons > 0
          then round(least(100::numeric, greatest(0::numeric, (expected_lessons - absences) * 100 / nullif(expected_lessons, 0))), 1)
        else 0::numeric
      end as attendance_percent
    from class_capacity
  ),
  level_totals as (
    select
      education_level,
      sum(active_students) as active_students,
      sum(expected_lessons) as expected_lessons,
      sum(absences) as absences,
      sum(estimated_presences) as estimated_presences
    from class_metrics
    group by education_level
  ),
  levels as (
    select
      v.education_level,
      v.label,
      coalesce(l.active_students, 0)::numeric as active_students,
      coalesce(l.expected_lessons, 0)::numeric as expected_lessons,
      coalesce(l.absences, 0)::numeric as absences,
      coalesce(l.estimated_presences, 0)::numeric as estimated_presences,
      coalesce(round(100 * l.absences / nullif(l.expected_lessons, 0), 1), 0)::numeric as absence_percent,
      coalesce(round(100 * l.estimated_presences / nullif(l.expected_lessons, 0), 1), 0)::numeric as attendance_percent
    from (
      values
        ('FUNDAMENTAL'::text, 'Fundamental'::text, 1),
        ('MEDIO'::text, 'Médio'::text, 2)
    ) as v(education_level, label, sort_order)
    left join level_totals l on l.education_level = v.education_level
  )
  select jsonb_build_object(
    'period', jsonb_build_object(
      'year', extract(year from cal.today)::int,
      'startDate', cal.start_date,
      'endDate', cal.today
    ),
    'summary', (
      select jsonb_build_object(
        'activeClasses', count(*),
        'activeStudents', round(coalesce(sum(active_students), 0)),
        'expectedLessons', round(coalesce(sum(expected_lessons), 0)),
        'absences', round(coalesce(sum(absences), 0)),
        'estimatedPresences', round(coalesce(sum(estimated_presences), 0)),
        'absencePercent', coalesce(round(100 * sum(absences) / nullif(sum(expected_lessons), 0), 1), 0),
        'attendancePercent', coalesce(round(100 * sum(estimated_presences) / nullif(sum(expected_lessons), 0), 1), 0)
      )
      from class_metrics
    ),
    'levels', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'key', education_level,
            'label', label,
            'activeStudents', round(active_students),
            'absencePercent', absence_percent,
            'attendancePercent', attendance_percent,
            'absences', round(absences),
            'estimatedPresences', round(estimated_presences),
            'expectedLessons', round(expected_lessons),
            'lessons', round(expected_lessons)
          )
          order by education_level
        )
        from (
          select * from levels order by case education_level
            when 'FUNDAMENTAL' then 1 else 2
          end
        ) ordered_levels
      ),
      '[]'::jsonb
    ),
    'classes', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'name', name,
            'educationLevel', education_level,
            'activeStudents', round(active_students),
            'absences', round(absences),
            'expectedLessons', round(expected_lessons),
            'estimatedPresences', round(estimated_presences),
            'absencePercent', absence_percent,
            'attendancePercent', attendance_percent
          )
          order by name
        )
        from class_metrics
      ),
      '[]'::jsonb
    ),
    'series', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'name', name,
            'educationLevel', education_level,
            'activeStudents', round(active_students),
            'absences', round(absences),
            'expectedLessons', round(expected_lessons),
            'estimatedPresences', round(estimated_presences),
            'absencePercent', absence_percent,
            'attendancePercent', attendance_percent
          )
          order by absences desc, absence_percent desc, name
        )
        from (
          select *
          from class_metrics
          where absences > 0
          order by absences desc, absence_percent desc, name
          limit 6
        ) series_top
      ),
      '[]'::jsonb
    )
  )
  from calendar cal;
$function$;

revoke all on function public.app_public_attendance_dashboard() from public, anon, authenticated;
grant execute on function public.app_public_attendance_dashboard() to anon, authenticated;

comment on function public.app_public_attendance_dashboard() is
  'Returns aggregated school attendance metrics for the public dashboard. Class and stage totals only; no student-level data is exposed.';
