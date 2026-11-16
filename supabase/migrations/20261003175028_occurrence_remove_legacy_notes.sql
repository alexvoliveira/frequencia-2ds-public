begin;
update public.occurrences set notes=null where notes is not null;
create or replace function public.app_update_occurrence(p_id bigint,p_student_id bigint,p_class_id bigint,p_date date,p_type_id bigint,p_description text,p_severity text,p_notes text default null) returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if public.app_current_role() not in ('ADMIN','TEACHER','STAFF') then raise exception using errcode='42501',message='Você não possui permissão para realizar esta ação.'; end if;
  if not exists(select 1 from public.occurrences where id=p_id) then raise exception using errcode='P0002',message='Ocorrência não encontrada.'; end if;
  if not exists(select 1 from public.occurrences where id=p_id and public.app_can_access_class(class_id)) then raise exception using errcode='42501',message='Você não possui acesso a esta ocorrência.'; end if;
  if not public.app_can_access_class(p_class_id) then raise exception using errcode='42501',message='Você não possui acesso a esta turma.'; end if;
  if p_severity not in ('LOW','MEDIUM','HIGH') then raise exception using errcode='22023',message='Gravidade inválida.'; end if;
  if length(trim(coalesce(p_description,'')))=0 then raise exception using errcode='22023',message='A descrição é obrigatória.'; end if;
  if not exists(select 1 from public.students s where s.id=p_student_id and s.class_id=p_class_id and s.active) then raise exception using errcode='23503',message='Aluno e turma não correspondem.'; end if;
  if not exists(select 1 from public.occurrence_types where id=p_type_id and active) then raise exception using errcode='23503',message='Tipo de ocorrência inválido.'; end if;
  update public.occurrences set student_id=p_student_id,class_id=p_class_id,date=p_date,occurrence_type_id=p_type_id,description=left(trim(p_description),4000),severity=p_severity,notes=null,updated_by=auth.uid(),updated_at=now() where id=p_id;
  return (select jsonb_build_object('id',id,'caseId',case_id,'studentId',student_id,'classId',class_id,'date',date,'occurrenceTypeId',occurrence_type_id,'description',description,'severity',severity) from public.occurrences where id=p_id);
end; $$;
grant execute on function public.app_update_occurrence(bigint,bigint,bigint,date,bigint,text,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
