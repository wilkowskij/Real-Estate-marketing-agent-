-- ----------------------------------------------------------------------------
-- Fix: RLS helper functions must be EXECUTE-able by the querying roles.
--
-- Migration 0003 revoked EXECUTE on is_org_member / is_org_admin from anon and
-- authenticated to keep them off the public RPC surface. But these SECURITY
-- DEFINER helpers are invoked *inside* RLS policies, which evaluate under the
-- caller's role. Without EXECUTE, every authenticated query that touches a
-- policy (memberships, listings, assets, campaigns, posts, social_accounts, …)
-- failed with "permission denied for function is_org_member" — so getOrgContext
-- returned null and the whole app bounced logged-in users to /login.
--
-- Re-grant EXECUTE so RLS works. (owns_membership, added in 0007, was already
-- revoked there for the same mistaken reason — fix it too.) These helpers only
-- reveal membership booleans for the current auth.uid(), so exposing them on the
-- RPC surface is not a meaningful risk.
-- ----------------------------------------------------------------------------
grant execute on function public.is_org_member(uuid) to authenticated, anon;
grant execute on function public.is_org_admin(uuid) to authenticated, anon;
grant execute on function public.owns_membership(uuid) to authenticated, anon;
