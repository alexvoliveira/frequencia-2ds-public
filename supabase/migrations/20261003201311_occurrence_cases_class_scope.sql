begin;

drop function if exists public.app_occurrence_cases_secure(text);
drop function if exists public.app_open_occurrence_case(bigint);
drop function if exists public.app_review_occurrence_case(bigint,text,text);

create function public.app_occurrence_cases_secure(
  p_class_id bigint,
  p_status text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_role text;
  result jsonb;
begin
  v_role := public.app_current_role();

  if v_role not in ('ADMIN','TEACHER') then
    raise exception using errcode='42501', message='Você não possui permissão para acessar o acompanhamento de ocorrências.';
  end if;

  if p_class_id is null then
    raise exception using errcode='22023', message='A turma atual é obrigatória.';
  end if;

  if not public.app_can_access_class(p_class_id) then
    raise exception using errcode='42501', message='Você não possui acesso a esta turma.';
  end if;

  if p_status is not null and p_status not in ('UNREAD','IN_REVIEW','RESOLVED') then
    raise exception using errcode='22023', message='Status inválido.';
  end if;

  select coalesce(jsonb_agg(row_data order by created_at desc),'[]'::jsonb)
  into result
  from (
    select
      jsonb_build_object(
        'id',oc.id,
        'classId',oc.class_id,
        'className',c.name,
        'date',oc.date,
        'status',oc.status,
        'handledBy',oc.handled_by,
        'handledByName',hp.name,
        'response',oc.response,
        'handledAt',oc.handled_at,
        'createdAt',oc.created_at,
        'updatedAt',oc.updated_at,
        'teacherName',tp.name,
        'students',(
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'id',s.id,
                'name',s.name,
                'description',o.description,
                'type',ot.name,
                'severity',o.severity
              )
              order by s.name
            ),
            '[]'::jsonb
          )
          from public.occurrences o
          join public.students s on s.id=o.student_id
          join public.occurrence_types ot on ot.id=o.occurrence_type_id
          where o.case_id=oc.id
            and o.class_id=p_class_id
        )
      ) row_data,
      oc.created_at
    from public.occurrence_cases oc
    join public.classes c on c.id=oc.class_id
    left join public.profiles hp on hp.id=oc.handled_by
    left join lateral (
      select o.created_by
      from public.occurrences o
      where o.case_id=oc.id
        and o.class_id=p_class_id
      order by o.id
      limit 1
    ) first_occ on true
    left join public.profiles tp on tp.id=first_occ.created_by
    where oc.class_id=p_class_id
      and (v_role='ADMIN' or oc.created_by=(select auth.uid()))
      and (p_status is null or oc.status=p_status)
  ) q;

  return result;
end;
$function$;

grant execute on function public.app_occurrence_cases_secure(bigint,text) to authenticated;
revoke execute on function public.app_occurrence_cases_secure(bigint,text) from anon, public;

create function public.app_open_occurrence_case(p_case_id bigint,p_class_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_case public.occurrence_cases;
begin
  if public.app_current_role() <> 'ADMIN' then
    raise exception using errcode='42501', message='Você não possui permissão para revisar ocorrências.';
  end if;

  if p_class_id is null or not public.app_can_access_class(p_class_id) then
    raise exception using errcode='42501', message='Você não possui acesso a esta turma.';
  end if;

  select * into v_case
  from public.occurrence_cases
  where id=p_case_id and class_id=p_class_id
  for update;

  if not found then
    raise exception using errcode='P0002', message='Ocorrência não encontrada nesta turma.';
  end if;

  if v_case.status='UNREAD' then
    update public.occurrence_cases
    set status='IN_REVIEW',
        handled_by=(select auth.uid()),
        handled_at=coalesce(handled_at,now()),
        updated_at=now()
    where id=p_case_id and class_id=p_class_id;

    select * into v_case
    from public.occurrence_cases
    where id=p_case_id and class_id=p_class_id;
  end if;

  return jsonb_build_object(
    'id',v_case.id,
    'classId',v_case.class_id,
    'status',v_case.status,
    'handledBy',v_case.handled_by,
    'response',v_case.response,
    'handledAt',v_case.handled_at,
    'handledByName',(select p.name from public.profiles p where p.id=v_case.handled_by)
  );
end;
$function$;

grant execute on function public.app_open_occurrence_case(bigint,bigint) to authenticated;
revoke execute on function public.app_open_occurrence_case(bigint,bigint) from anon, public;

create function public.app_review_occurrence_case(
  p_case_id bigint,
  p_class_id bigint,
  p_status text,
  p_response text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_case public.occurrence_cases;
  v_response text := nullif(left(trim(coalesce(p_response,'')),8000),'');
begin
  if public.app_current_role() <> 'ADMIN' then
    raise exception using errcode='42501', message='Você não possui permissão para resolver ocorrências.';
  end if;

  if p_class_id is null or not public.app_can_access_class(p_class_id) then
    raise exception using errcode='42501', message='Você não possui acesso a esta turma.';
  end if;

  if p_status <> 'RESOLVED' then
    raise exception using errcode='22023', message='Apenas o status de resolução pode ser registrado nesta etapa.';
  end if;

  if v_response is null then
    raise exception using errcode='22023', message='A resposta da direção é obrigatória para resolver a ocorrência.';
  end if;

  select * into v_case
  from public.occurrence_cases
  where id=p_case_id and class_id=p_class_id
  for update;

  if not found then
    raise exception using errcode='P0002', message='Ocorrência não encontrada nesta turma.';
  end if;

  if v_case.status <> 'IN_REVIEW' then
    raise exception using errcode='42501', message='A ocorrência precisa estar em revisão antes de ser resolvida.';
  end if;

  update public.occurrence_cases
  set status='RESOLVED',
      handled_by=(select auth.uid()),
      response=v_response,
      handled_at=now(),
      updated_at=now()
  where id=p_case_id and class_id=p_class_id;

  select * into v_case
  from public.occurrence_cases
  where id=p_case_id and class_id=p_class_id;

  return jsonb_build_object(
    'id',v_case.id,
    'classId',v_case.class_id,
    'status',v_case.status,
    'response',v_case.response,
    'handledBy',v_case.handled_by,
    'handledAt',v_case.handled_at,
    'handledByName',(select p.name from public.profiles p where p.id=v_case.handled_by)
  );
end;
$function$;

grant execute on function public.app_review_occurrence_case(bigint,bigint,text,text) to authenticated;
revoke execute on function public.app_review_occurrence_case(bigint,bigint,text,text) from anon, public;

create index if not exists occurrence_cases_class_status_created_idx
  on public.occurrence_cases(class_id,status,created_at desc);

notify pgrst,'reload schema';
commit;
