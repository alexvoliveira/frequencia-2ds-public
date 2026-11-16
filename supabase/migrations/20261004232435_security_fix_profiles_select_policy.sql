begin;

drop policy if exists profiles_select on public.profiles;

create policy profiles_select
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

notify pgrst,'reload schema';

commit;
