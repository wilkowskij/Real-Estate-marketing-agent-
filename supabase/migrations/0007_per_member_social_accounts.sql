-- ----------------------------------------------------------------------------
-- Per-person social connections.
--
-- Social accounts can be connected per-agent (owner = 'member', tied to a
-- membership) rather than only org-wide. Each member manages their own
-- connections; org owners/admins may still manage org-owned rows. This replaces
-- the admin-only policy from 0001.
-- ----------------------------------------------------------------------------

-- Helper: does the given membership row belong to the current user?
create or replace function owns_membership(target_membership uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.id = target_membership and m.user_id = auth.uid()
  );
$$;

-- Keep this helper off the public RPC surface (consistent with 0003).
revoke execute on function public.owns_membership(uuid) from anon, authenticated;
revoke execute on function public.owns_membership(uuid) from public;

drop policy if exists "social_accounts_rw" on social_accounts;

-- A member can read/write a row they own (owner = 'member' and the membership is
-- theirs); org owners/admins can read/write org-owned rows.
create policy "social_accounts_member_rw" on social_accounts for all
  using (
    (owner = 'member' and owns_membership(membership_id))
    or (owner = 'org' and is_org_admin(org_id))
  )
  with check (
    (owner = 'member' and owns_membership(membership_id) and is_org_member(org_id))
    or (owner = 'org' and is_org_admin(org_id))
  );

-- Members may also read connections across their org (e.g. to see team coverage)
-- without being able to modify them.
create policy "social_accounts_read" on social_accounts for select
  using (is_org_member(org_id));
