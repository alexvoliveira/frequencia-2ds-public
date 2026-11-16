begin;

-- PostgREST executes db_pre_request as the authenticator role before RPC calls.
-- Keep the rate-limit hook inaccessible to client roles while allowing PostgREST
-- to execute the SECURITY DEFINER function.
grant execute on function public.check_api_request() to authenticator;

notify pgrst, 'reload config';

commit;
