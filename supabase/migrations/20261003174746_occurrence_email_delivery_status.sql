begin;
create or replace function public.app_mark_occurrence_email(p_case_id bigint,p_status text,p_error text default null) returns void language plpgsql security definer set search_path=public as $$
declare v_created_by uuid; v_class_id bigint; v_error text:=nullif(left(trim(coalesce(p_error,'')),1000),'');
begin
  if p_status not in ('SENT','FAILED') then raise exception using errcode='22023',message='Status de e-mail inválido.'; end if;
  select created_by,class_id into v_created_by,v_class_id from public.occurrence_cases where id=p_case_id;
  if not found then raise exception using errcode='P0002',message='Ocorrência não encontrada.'; end if;
  if v_created_by is distinct from auth.uid() and not public.app_is_occurrence_manager() then raise exception using errcode='42501',message='Você não possui permissão para atualizar o envio desta ocorrência.'; end if;
  if not public.app_can_access_class(v_class_id) then raise exception using errcode='42501',message='Você não possui acesso a esta ocorrência.'; end if;
  update public.occurrence_cases set email_status=p_status,email_sent_at=case when p_status='SENT' then now() else email_sent_at end,email_last_error=case when p_status='FAILED' then v_error else null end,updated_at=now() where id=p_case_id;
end; $$;
grant execute on function public.app_mark_occurrence_email(bigint,text,text) to authenticated;
revoke execute on function public.app_mark_occurrence_email(bigint,text,text) from anon,public;
notify pgrst,'reload schema';
commit;
