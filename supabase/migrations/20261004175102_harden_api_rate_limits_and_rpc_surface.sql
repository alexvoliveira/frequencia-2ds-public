create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table if not exists private.api_rate_limits (
  bucket text not null,
  user_id uuid not null,
  window_start timestamptz not null,
  request_count integer not null check (request_count >= 1),
  primary key (bucket, user_id)
);

revoke all on table private.api_rate_limits from public, anon, authenticated;

create or replace function private.consume_api_rate_limit(
  p_user_id uuid,
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  if p_user_id is null or p_bucket is null or p_bucket = '' or p_limit < 1 or p_window_seconds < 1 then
    raise exception using
      errcode = '22023',
      message = 'Parâmetros de rate limit inválidos.';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into private.api_rate_limits(bucket, user_id, window_start, request_count)
  values (p_bucket, p_user_id, v_window_start, 1)
  on conflict (bucket, user_id) do update
  set
    window_start = excluded.window_start,
    request_count = case
      when private.api_rate_limits.window_start = excluded.window_start
        then least(private.api_rate_limits.request_count + 1, p_limit + 1)
      else 1
    end
  returning request_count into v_count;

  return v_count;
end;
$function$;

revoke all on function private.consume_api_rate_limit(uuid, text, integer, integer)
  from public, anon, authenticated;

create or replace function public.check_api_request()
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  req_method text := upper(coalesce(current_setting('request.method', true), ''));
  req_path text := lower(coalesce(current_setting('request.path', true), ''));
  claims jsonb;
  jwt_role text;
  req_user_id uuid;
  bucket text := 'other';
  request_limit integer := 120;
  window_seconds integer := 60;
  request_count integer;
  window_start timestamptz;
  retry_after integer;
begin
  if req_method in ('GET', 'HEAD') then
    return;
  end if;

  claims := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );

  jwt_role := claims ->> 'role';

  if jwt_role <> 'authenticated' then
    return;
  end if;

  req_user_id := nullif(claims ->> 'sub', '')::uuid;

  if req_user_id is null or req_path not like 'rpc/%' then
    return;
  end if;

  if req_path in (
    'rpc/app_dashboard_secure',
    'rpc/app_student_detail_secure',
    'rpc/app_students_list_secure',
    'rpc/app_ranking_json_secure',
    'rpc/app_report_attendance_secure',
    'rpc/app_report_occurrences_secure',
    'rpc/app_occurrence_cases_secure',
    'rpc/app_teacher_feedback_secure'
  ) then
    bucket := 'heavy_read';
    request_limit := 30;
    window_seconds := 60;
  elsif req_path in (
    'rpc/app_create_attendance_bulk',
    'rpc/app_create_justification_bulk',
    'rpc/app_create_occurrence_bulk',
    'rpc/app_delete_records_bulk'
  ) then
    bucket := 'bulk_mutation';
    request_limit := 10;
    window_seconds := 60;
  elsif req_path = 'rpc/app_create_teacher_feedback' then
    bucket := 'feedback';
    request_limit := 5;
    window_seconds := 600;
  else
    bucket := 'mutation';
    request_limit := 60;
    window_seconds := 60;
  end if;

  window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / window_seconds) * window_seconds
  );

  request_count := private.consume_api_rate_limit(
    req_user_id,
    bucket,
    request_limit,
    window_seconds
  );

  if request_count > request_limit then
    retry_after := greatest(
      1,
      ceil(
        extract(
          epoch from (
            window_start
            + make_interval(secs => window_seconds)
            - clock_timestamp()
          )
        )
      )::integer
    );

    raise sqlstate 'PGRST'
      using
        message = json_build_object(
          'code', 'API_RATE_LIMITED',
          'message', 'Muitas requisições. Tente novamente em alguns segundos.'
        )::text,
        detail = json_build_object(
          'status', 429,
          'status_text', 'Too Many Requests',
          'headers', json_build_object('Retry-After', retry_after::text)
        )::text;
  end if;
end;
$function$;

revoke all on function public.check_api_request() from public, anon, authenticated;

alter role authenticator
  set pgrst.db_pre_request = 'public.check_api_request';

notify pgrst, 'reload config';

revoke execute on function public.app_current_role() from authenticated;
revoke execute on function public.app_rls_can_access_class(bigint) from authenticated;

grant execute on function public.app_delete_records_bulk(jsonb) to authenticated;

create index if not exists occurrence_cases_handled_by_idx
  on public.occurrence_cases (handled_by);

create index if not exists teacher_feedback_handled_by_idx
  on public.teacher_feedback (handled_by);

drop index if exists public.occurrence_cases_class_status_idx;

drop policy if exists occurrence_cases_deny_all on public.occurrence_cases;
create policy occurrence_cases_deny_all
  on public.occurrence_cases
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists teacher_feedback_deny_all on public.teacher_feedback;
create policy teacher_feedback_deny_all
  on public.teacher_feedback
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists roles_deny_all on public.roles;
create policy roles_deny_all
  on public.roles
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);
