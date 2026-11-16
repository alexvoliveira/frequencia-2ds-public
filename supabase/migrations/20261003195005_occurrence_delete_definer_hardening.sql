begin;

alter function public.app_delete_occurrence(bigint)
  set search_path = '';

notify pgrst, 'reload schema';

commit;
