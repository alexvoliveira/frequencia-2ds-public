begin;

-- Teachers may delete only their own occurrence while it is still pending.
-- Administrators retain the existing ability to delete any occurrence.
create or replace function public.app_delete_occurrence(p_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_role text := public.app_current_role();
  v_case_id bigint;
  v_class_id bigint;
  v_created_by uuid;
  v_case_status text;
begin
  if v_user_id is null or v_role not in ('ADMIN', 'TEACHER') then
    raise exception using errcode = '42501',
      message = 'Você não possui permissão para excluir esta ocorrência.';
  end if;

  select o.case_id, o.class_id, o.created_by, oc.status
    into v_case_id, v_class_id, v_created_by, v_case_status
  from public.occurrences o
  join public.occurrence_cases oc on oc.id = o.case_id
  where o.id = p_id
  for update of o, oc;

  if not found then
    raise exception using errcode = 'P0002',
      message = 'Ocorrência não encontrada.';
  end if;

  if not public.app_can_access_class(v_class_id) then
    raise exception using errcode = '42501',
      message = 'Você não possui acesso a esta ocorrência.';
  end if;

  if v_role = 'TEACHER' then
    if v_created_by is distinct from v_user_id then
      raise exception using errcode = '42501',
        message = 'Professores só podem excluir ocorrências que registraram.';
    end if;

    if v_case_status is distinct from 'UNREAD' then
      raise exception using errcode = '42501',
        message = 'A ocorrência já foi encaminhada e não pode mais ser excluída pelo professor.';
    end if;
  end if;

  delete from public.occurrences where id = p_id;
  if not found then
    raise exception using errcode = 'P0002',
      message = 'Ocorrência não encontrada.';
  end if;

  if not exists (
    select 1 from public.occurrences where case_id = v_case_id
  ) then
    delete from public.occurrence_cases where id = v_case_id;
  end if;
end;
$function$;

revoke all on function public.app_delete_occurrence(bigint) from public, anon;
grant execute on function public.app_delete_occurrence(bigint) to authenticated;

-- Return the creator and workflow state only for occurrence-history entries.
-- This lets the UI show the correct action without trusting UI-only checks.
create or replace function public.app_student_detail_secure(p_student_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_class_id bigint;
  v_result jsonb;
begin
  select class_id into v_class_id
  from public.students
  where id = p_student_id;

  if v_class_id is null or not public.app_can_access_class(v_class_id) then
    raise exception using errcode = '42501',
      message = 'Você não possui acesso a este aluno.';
  end if;

  v_result := public.app_student_detail(p_student_id);

  if jsonb_typeof(v_result->'history') = 'array' then
    v_result := jsonb_set(
      v_result,
      '{history}',
      coalesce(
        (
          select jsonb_agg(
            case
              when h.item->>'entityType' = 'OCCURRENCE' and o.id is not null
                then h.item || jsonb_build_object(
                  'createdBy', o.created_by,
                  'caseStatus', oc.status
                )
              else h.item
            end
            order by h.ordinality
          )
          from jsonb_array_elements(v_result->'history')
            with ordinality as h(item, ordinality)
          left join public.occurrences o
            on h.item->>'entityType' = 'OCCURRENCE'
            and o.id = (h.item->>'id')::bigint
          left join public.occurrence_cases oc on oc.id = o.case_id
        ),
        '[]'::jsonb
      ),
      true
    );
  end if;

  return v_result;
end;
$function$;

revoke all on function public.app_student_detail_secure(bigint) from public, anon;
grant execute on function public.app_student_detail_secure(bigint) to authenticated;

-- The unscoped implementation is used internally by the secure wrapper only.
-- Prevent direct Data API calls that would bypass the class-access check.
revoke all on function public.app_student_detail(bigint) from public, anon, authenticated;

-- Remove the mutable public search_path from SECURITY DEFINER functions.
-- Audited definitions use schema-qualified application objects; pg_catalog
-- built-ins remain resolvable with an empty path.
do $hardening$
declare
  fn record;
begin
  for fn in
    select n.nspname as schema_name,
           p.proname as function_name,
           pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and not coalesce(p.proconfig, array[]::text[]) @> array['search_path=""']::text[]
  loop
    execute format(
      'alter function %I.%I(%s) set search_path = %L',
      fn.schema_name,
      fn.function_name,
      fn.identity_args,
      ''
    );
  end loop;
end;
$hardening$;

notify pgrst, 'reload schema';
commit;
