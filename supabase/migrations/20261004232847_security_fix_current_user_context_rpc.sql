begin;

create or replace function public.app_current_user_context_secure()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_profile public.profiles;
  v_theme text;
begin
  if v_user_id is null then
    raise exception using errcode='42501', message='Usuário não autenticado.';
  end if;

  select *
  into v_profile
  from public.profiles
  where id=v_user_id
    and active=true;

  if not found then
    raise exception using errcode='42501', message='Sua conta não está autorizada a acessar o sistema.';
  end if;

  select theme
  into v_theme
  from public.user_theme_preferences
  where user_id=v_user_id;

  return jsonb_build_object(
    'id',v_profile.id,
    'name',v_profile.name,
    'role',v_profile.role_code,
    'active',v_profile.active,
    'theme',case when v_theme='dark' then 'dark' else 'light' end
  );
end;
$function$;

revoke all on function public.app_current_user_context_secure() from anon, public;
grant execute on function public.app_current_user_context_secure() to authenticated;

notify pgrst,'reload schema';

commit;
