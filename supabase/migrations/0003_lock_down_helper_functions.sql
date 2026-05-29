-- These SECURITY DEFINER functions are internal helpers used by RLS policies
-- and the new-user trigger. They should not be callable from the public REST
-- RPC surface. Revoke EXECUTE from the API roles and from PUBLIC (Postgres
-- grants EXECUTE to PUBLIC by default). RLS policy evaluation and the auth
-- trigger still run them under definer rights, not the caller's grants.
revoke execute on function public.is_org_member(uuid) from anon, authenticated;
revoke execute on function public.is_org_admin(uuid) from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;

revoke execute on function public.is_org_member(uuid) from public;
revoke execute on function public.is_org_admin(uuid) from public;
revoke execute on function public.handle_new_user() from public;
