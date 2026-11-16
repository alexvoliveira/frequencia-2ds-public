begin;

-- Inactive profiles and Auth users missing a profile must fail closed.
create or replace function public.app_current_user_context_secure()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_email text;
  v_name text;
  v_role text;
  v_active boolean;
  v_theme text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501',
      message = 'Usuário não autenticado.';
  end if;

  select
    u.email,
    coalesce(
      nullif(trim(p.name), ''),
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
      split_part(coalesce(u.email, ''), '@', 1),
      'Usuário'
    ),
    coalesce(p.role_code, 'VIEWER'),
    coalesce(p.active, false)
  into v_email, v_name, v_role, v_active
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = v_user_id
    and u.deleted_at is null
  limit 1;

  if v_email is null or v_active is not true then
    raise exception using errcode = '42501',
      message = 'Sua conta não está autorizada a acessar o sistema.';
  end if;

  select theme into v_theme
  from public.user_theme_preferences
  where user_id = v_user_id;

  return jsonb_build_object(
    'id', v_user_id,
    'name', v_name,
    'role', v_role,
    'active', v_active,
    'theme', case when v_theme = 'dark' then 'dark' else 'light' end
  );
end;
$function$;

revoke all on function public.app_current_user_context_secure() from public, anon;
grant execute on function public.app_current_user_context_secure() to authenticated;

-- Class-scoped access must never grant access to a disabled account merely
-- because an old class_user_access row still exists.
create or replace function public.app_can_access_class(p_class_id bigint)
returns boolean
language sql
stable
set search_path = ''
as $function$
  select public.app_is_active_user()
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
