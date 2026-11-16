begin;

drop function if exists public.app_mark_occurrence_email(bigint, text, text);
drop function if exists public.app_occurrence_notification_payload(bigint);
drop function if exists public.app_is_occurrence_manager();

drop table if exists public.occurrence_direction_managers;

alter table public.occurrence_cases
  drop constraint if exists occurrence_cases_email_status_check;

drop index if exists public.occurrence_cases_email_status_idx;

alter table public.occurrence_cases
  drop column if exists email_to,
  drop column if exists email_status,
  drop column if exists email_sent_at,
  drop column if exists email_last_error;

drop function if exists public.app_create_occurrence(bigint, bigint, date, bigint, text, text, text);
drop function if exists public.app_update_occurrence(bigint, bigint, bigint, date, bigint, text, text, text);

create function public.app_create_occurrence(
  p_student_id bigint,
  p_class_id bigint,
  p_date date,
  p_type_id bigint,
  p_description text,
  p_severity text default 'LOW'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_id bigint;
  v_case_id bigint;
begin
  if public.app_current_role() not in ('ADMIN','TEACHER','STAFF') then
    raise exception using errcode='42501', message='Você não possui permissão para realizar esta ação.';
  end if;

  if not public.app_can_access_class(p_class_id) then
    raise exception using errcode='42501', message='Você não possui acesso a esta turma.';
  end if;

  if p_date is null then
    raise exception using errcode='22023', message='A data da ocorrência é obrigatória.';
  end if;

  if p_severity not in ('LOW','MEDIUM','HIGH') then
    raise exception using errcode='22023', message='Gravidade inválida.';
  end if;

  if length(trim(coalesce(p_description,''))) = 0 then
    raise exception using errcode='22023', message='A descrição é obrigatória.';
  end if;

  if not exists (
    select 1 from public.students s
    where s.id=p_student_id and s.class_id=p_class_id and s.active
  ) then
    raise exception using errcode='23503', message='Aluno e turma não correspondem.';
  end if;

  if not exists (
    select 1 from public.occurrence_types ot
    where ot.id=p_type_id and ot.active
  ) then
    raise exception using errcode='23503', message='Tipo de ocorrência inválido.';
  end if;

  insert into public.occurrence_cases(class_id,date,created_by)
  values (p_class_id,p_date,(select auth.uid()))
  returning id into v_case_id;

  insert into public.occurrences(
    student_id,class_id,occurrence_type_id,date,description,severity,notes,case_id
  )
  values (
    p_student_id,p_class_id,p_type_id,p_date,
    left(trim(p_description),4000),p_severity,null,v_case_id
  )
  returning id into v_id;

  return jsonb_build_object(
    'id',v_id,
    'caseId',v_case_id,
    'studentId',p_student_id,
    'classId',p_class_id,
    'date',p_date,
    'occurrenceTypeId',p_type_id,
    'description',left(trim(p_description),4000),
    'severity',p_severity
  );
end;
$function$;

grant execute on function public.app_create_occurrence(bigint,bigint,date,bigint,text,text) to authenticated;
revoke execute on function public.app_create_occurrence(bigint,bigint,date,bigint,text,text) from anon, public;

create function public.app_update_occurrence(
  p_id bigint,
  p_student_id bigint,
  p_class_id bigint,
  p_date date,
  p_type_id bigint,
  p_description text,
  p_severity text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_role text;
  v_case_status text;
begin
  v_role := public.app_current_role();

  if v_role not in ('ADMIN','TEACHER','STAFF') then
    raise exception using errcode='42501', message='Você não possui permissão para realizar esta ação.';
  end if;

  if not exists (select 1 from public.occurrences o where o.id=p_id) then
    raise exception using errcode='P0002', message='Ocorrência não encontrada.';
  end if;

  select oc.status into v_case_status
  from public.occurrences o
  join public.occurrence_cases oc on oc.id=o.case_id
  where o.id=p_id;

  if v_role='TEACHER' and v_case_status <> 'UNREAD' then
    raise exception using errcode='42501', message='Esta ocorrência já foi encaminhada para a direção e não pode mais ser editada.';
  end if;

  if not exists (
    select 1
    from public.occurrences o
    where o.id=p_id
      and public.app_can_access_class(o.class_id)
      and (v_role='ADMIN' or o.created_by=(select auth.uid()))
  ) then
    raise exception using errcode='42501', message='Você não possui acesso a esta ocorrência.';
  end if;

  if not public.app_can_access_class(p_class_id) then
    raise exception using errcode='42501', message='Você não possui acesso a esta turma.';
  end if;

  if p_date is null then
    raise exception using errcode='22023', message='A data da ocorrência é obrigatória.';
  end if;

  if p_severity not in ('LOW','MEDIUM','HIGH') then
    raise exception using errcode='22023', message='Gravidade inválida.';
  end if;

  if length(trim(coalesce(p_description,'')))=0 then
    raise exception using errcode='22023', message='A descrição é obrigatória.';
  end if;

  if not exists (
    select 1 from public.students s
    where s.id=p_student_id and s.class_id=p_class_id and s.active
  ) then
    raise exception using errcode='23503', message='Aluno e turma não correspondem.';
  end if;

  if not exists (
    select 1 from public.occurrence_types ot
    where ot.id=p_type_id and ot.active
  ) then
    raise exception using errcode='23503', message='Tipo de ocorrência inválido.';
  end if;

  update public.occurrences
  set student_id=p_student_id,
      class_id=p_class_id,
      date=p_date,
      occurrence_type_id=p_type_id,
      description=left(trim(p_description),4000),
      severity=p_severity,
      notes=null,
      updated_by=(select auth.uid()),
      updated_at=now()
  where id=p_id;

  return (
    select jsonb_build_object(
      'id',o.id,
      'caseId',o.case_id,
      'studentId',o.student_id,
      'classId',o.class_id,
      'date',o.date,
      'occurrenceTypeId',o.occurrence_type_id,
      'description',o.description,
      'severity',o.severity
    )
    from public.occurrences o
    where o.id=p_id
  );
end;
$function$;

grant execute on function public.app_update_occurrence(bigint,bigint,bigint,date,bigint,text,text) to authenticated;
revoke execute on function public.app_update_occurrence(bigint,bigint,bigint,date,bigint,text,text) from anon, public;

create or replace function public.app_create_occurrence_bulk(
  p_class_id bigint,
  p_date date,
  p_type_id bigint,
  p_severity text,
  p_general_message text,
  p_students jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  item jsonb;
  v_student_id bigint;
  v_description text;
  v_id bigint;
  v_case_id bigint;
  v_rows jsonb := '[]'::jsonb;
  v_count integer;
begin
  if public.app_current_role() not in ('ADMIN','TEACHER','STAFF') then
    raise exception using errcode='42501', message='Você não possui permissão para realizar esta ação.';
  end if;

  if not public.app_can_access_class(p_class_id) then
    raise exception using errcode='42501', message='Você não possui acesso a esta turma.';
  end if;

  if p_date is null or p_severity not in ('LOW','MEDIUM','HIGH') then
    raise exception using errcode='22023', message='Dados da ocorrência inválidos.';
  end if;

  if nullif(left(trim(coalesce(p_general_message,'')),4000),'') is null then
    raise exception using errcode='22023', message='A descrição geral é obrigatória para registros em massa.';
  end if;

  if not exists (
    select 1 from public.occurrence_types ot
    where ot.id=p_type_id and ot.active
  ) then
    raise exception using errcode='23503', message='Tipo de ocorrência inválido.';
  end if;

  if jsonb_typeof(coalesce(p_students,'[]'::jsonb)) <> 'array' then
    raise exception using errcode='22023', message='A lista de alunos é inválida.';
  end if;

  select jsonb_array_length(p_students) into v_count;

  if v_count < 1 or v_count > 100 then
    raise exception using errcode='22023', message='Selecione entre 1 e 100 alunos.';
  end if;

  if exists (
    select 1
    from (
      select (value->>'studentId')::bigint student_id
      from jsonb_array_elements(p_students)
    ) x
    group by student_id
    having count(*) > 1
  ) then
    raise exception using errcode='23505', message='Um aluno foi selecionado mais de uma vez.';
  end if;

  insert into public.occurrence_cases(class_id,date,created_by)
  values (p_class_id,p_date,(select auth.uid()))
  returning id into v_case_id;

  for item in select value from jsonb_array_elements(p_students) value loop
    v_student_id := nullif(item->>'studentId','')::bigint;
    v_description := nullif(left(trim(coalesce(item->>'description','')),4000),'');

    if v_student_id is null then
      raise exception using errcode='22023', message='Aluno inválido na seleção.';
    end if;

    if not exists (
      select 1 from public.students s
      where s.id=v_student_id and s.class_id=p_class_id and s.active
    ) then
      raise exception using errcode='23503', message='Aluno não encontrado ou não pertence à turma selecionada.';
    end if;

    insert into public.occurrences(
      student_id,class_id,occurrence_type_id,date,description,severity,notes,case_id
    )
    values (
      v_student_id,p_class_id,p_type_id,p_date,
      coalesce(v_description,left(trim(p_general_message),4000)),
      p_severity,null,v_case_id
    )
    returning id into v_id;

    v_rows := v_rows || jsonb_build_array(
      jsonb_build_object(
        'id',v_id,
        'caseId',v_case_id,
        'studentId',v_student_id,
        'classId',p_class_id,
        'date',p_date,
        'occurrenceTypeId',p_type_id,
        'description',coalesce(v_description,left(trim(p_general_message),4000)),
        'severity',p_severity
      )
    );
  end loop;

  return jsonb_build_object('created',v_count,'caseId',v_case_id,'rows',v_rows);
end;
$function$;

grant execute on function public.app_create_occurrence_bulk(bigint,date,bigint,text,text,jsonb) to authenticated;
revoke execute on function public.app_create_occurrence_bulk(bigint,date,bigint,text,text,jsonb) from anon, public;

create or replace function public.app_occurrence_cases_secure(p_status text default null)
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
        'teacherName',case when v_role='ADMIN' then tp.name else null end,
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
      order by o.id
      limit 1
    ) first_occ on true
    left join public.profiles tp on tp.id=first_occ.created_by
    where
      public.app_can_access_class(oc.class_id)
      and (
        v_role='ADMIN'
        or oc.created_by=(select auth.uid())
      )
      and (p_status is null or oc.status=p_status)
  ) q;

  return result;
end;
$function$;

grant execute on function public.app_occurrence_cases_secure(text) to authenticated;
revoke execute on function public.app_occurrence_cases_secure(text) from anon, public;

create or replace function public.app_open_occurrence_case(p_case_id bigint)
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

  select * into v_case
  from public.occurrence_cases
  where id=p_case_id
  for update;

  if not found then
    raise exception using errcode='P0002', message='Ocorrência não encontrada.';
  end if;

  if not public.app_can_access_class(v_case.class_id) then
    raise exception using errcode='42501', message='Você não possui acesso a esta ocorrência.';
  end if;

  if v_case.status='UNREAD' then
    update public.occurrence_cases
    set status='IN_REVIEW',
        handled_by=(select auth.uid()),
        handled_at=coalesce(handled_at,now()),
        updated_at=now()
    where id=p_case_id;

    select * into v_case
    from public.occurrence_cases
    where id=p_case_id;
  end if;

  return jsonb_build_object(
    'id',v_case.id,
    'status',v_case.status,
    'handledBy',v_case.handled_by,
    'response',v_case.response,
    'handledAt',v_case.handled_at,
    'handledByName',(
      select p.name from public.profiles p where p.id=v_case.handled_by
    )
  );
end;
$function$;

grant execute on function public.app_open_occurrence_case(bigint) to authenticated;
revoke execute on function public.app_open_occurrence_case(bigint) from anon, public;

create or replace function public.app_review_occurrence_case(
  p_case_id bigint,
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

  if p_status <> 'RESOLVED' then
    raise exception using errcode='22023', message='Apenas o status de resolução pode ser registrado nesta etapa.';
  end if;

  if v_response is null then
    raise exception using errcode='22023', message='A resposta da direção é obrigatória para resolver a ocorrência.';
  end if;

  select * into v_case
  from public.occurrence_cases
  where id=p_case_id
  for update;

  if not found then
    raise exception using errcode='P0002', message='Ocorrência não encontrada.';
  end if;

  if not public.app_can_access_class(v_case.class_id) then
    raise exception using errcode='42501', message='Você não possui acesso a esta ocorrência.';
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
  where id=p_case_id;

  select * into v_case
  from public.occurrence_cases
  where id=p_case_id;

  return jsonb_build_object(
    'id',v_case.id,
    'status',v_case.status,
    'handledBy',v_case.handled_by,
    'response',v_case.response,
    'handledAt',v_case.handled_at,
    'handledByName',(
      select p.name from public.profiles p where p.id=v_case.handled_by
    )
  );
end;
$function$;

grant execute on function public.app_review_occurrence_case(bigint,text,text) to authenticated;
revoke execute on function public.app_review_occurrence_case(bigint,text,text) from anon, public;

create index if not exists occurrence_cases_creator_status_idx
  on public.occurrence_cases(created_by,status,created_at desc);

notify pgrst,'reload schema';

commit;
