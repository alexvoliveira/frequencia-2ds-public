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
  class_totals as (
    select
      c.id,
      c.name,
      c.education_level,
      coalesce(sum(a.quantity), 0)::numeric as total_lessons,
      coalesce(sum(a.quantity) filter (where a.status = 'ABSENT'), 0)::numeric as absences
    from public.classes c
    cross join params p
    left join public.attendance_records a
      on a.class_id = c.id
     and a.date between make_date(extract(year from p.today)::int, 1, 1) and p.today
    where c.active = true
    group by c.id, c.name, c.education_level
  ),
  level_totals as (
    select
      education_level,
      sum(total_lessons) as total_lessons,
      sum(absences) as absences
    from class_totals
    group by education_level
  ),
  levels as (
    select
      v.education_level,
      coalesce(l.total_lessons, 0)::numeric as total_lessons,
      coalesce(l.absences, 0)::numeric as absences,
      coalesce(round(100 * l.absences / nullif(l.total_lessons, 0), 1), 0)::numeric as absence_percent
    from (
      values ('FUNDAMENTAL'::text), ('MEDIO'::text)
    ) v(education_level)
    left join level_totals l using (education_level)
  ),
  series_top as (
    select education_level, name, absences::numeric
    from class_totals
    where absences > 0
    order by absences desc, name
    limit 6
  )
  select jsonb_build_object(
    'period', jsonb_build_object(
      'year', extract(year from p.today)::int,
      'startDate', make_date(extract(year from p.today)::int, 1, 1),
      'endDate', p.today
    ),
    'levels', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'key', education_level,
            'label', case
              when education_level = 'FUNDAMENTAL' then 'Fundamental'
              else 'Médio'
            end,
            'absencePercent', absence_percent,
            'absences', absences,
            'lessons', total_lessons
          )
          order by case education_level
            when 'FUNDAMENTAL' then 1
            else 2
          end
        )
        from levels
      ),
      '[]'::jsonb
    ),
    'series', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'name', name,
            'educationLevel', education_level,
            'absences', absences
          )
          order by absences desc, name
        )
        from series_top
      ),
      '[]'::jsonb
    )
  )
  from params p;
$function$;

revoke all on function public.app_public_attendance_dashboard() from public, anon, authenticated;
grant execute on function public.app_public_attendance_dashboard() to anon, authenticated;
