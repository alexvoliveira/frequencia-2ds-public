begin;
create or replace function public.app_occurrence_notification_payload(p_case_id bigint) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare c record; teacher record; students jsonb;
begin
  select oc.* into c from public.occurrence_cases oc where oc.id=p_case_id;
  if not found then raise exception using errcode='P0002',message='Ocorrência não encontrada.'; end if;
  if not public.app_can_access_class(c.class_id) then raise exception using errcode='42501',message='Você não possui acesso a esta ocorrência.'; end if;
  if not exists(select 1 from public.occurrences o where o.case_id=p_case_id and o.created_by=(select auth.uid())) and not public.app_is_occurrence_manager() then raise exception using errcode='42501',message='Você não possui permissão para enviar esta ocorrência.'; end if;
  select p.name,u.email into teacher from public.occurrences o join public.profiles p on p.id=o.created_by join auth.users u on u.id=o.created_by where o.case_id=p_case_id order by o.id limit 1;
  select coalesce(jsonb_agg(jsonb_build_object('name',s.name,'description',o.description,'type',ot.name,'severity',o.severity) order by s.name),'[]'::jsonb) into students from public.occurrences o join public.students s on s.id=o.student_id join public.occurrence_types ot on ot.id=o.occurrence_type_id where o.case_id=p_case_id;
  return jsonb_build_object('caseId',c.id,'classId',c.class_id,'date',c.date,'status',c.status,'emailTo',c.email_to,'teacher',jsonb_build_object('name',coalesce(teacher.name,'Usuário'),'email',coalesce(teacher.email,'')),'className',(select name from public.classes where id=c.class_id),'students',students);
end; $$;
grant execute on function public.app_occurrence_notification_payload(bigint) to authenticated;
revoke execute on function public.app_occurrence_notification_payload(bigint) from anon,public;
notify pgrst,'reload schema';
commit;
