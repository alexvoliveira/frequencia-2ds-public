begin;

create or replace function public.app_can_access_class(p_class_id bigint)
returns boolean
language sql
stable
set search_path = ''
as $function$
  select
    (select auth.uid()) is not null
    and (
      public.app_current_role() in ('ADMIN', 'TEACHER')
      or exists (
        select 1
        from public.class_user_access cua
        where cua.user_id = (select auth.uid())
          and cua.class_id = p_class_id
      )
    );
$function$;

notify pgrst, 'reload schema';

commit;
