-- ----------------------------------------------------------------------------
-- Consolidate multiple permissive SELECT policies on the per-request hot tables
-- (memberships + profiles are read on every authenticated request). Each
-- FOR ALL write policy is split into INSERT/UPDATE/DELETE so SELECT evaluates a
-- single policy.
--
-- Safe / visibility-preserving: every write policy's row set is a strict subset
-- of its read policy — admin ⊂ member (memberships), self ⊂ everyone (profiles),
-- owner/admin ⊂ member (social_accounts) — so removing the write policy from the
-- SELECT path cannot hide any row. See docs/SCALABILITY.md.
-- ----------------------------------------------------------------------------

-- memberships (SELECT governed by memberships_read = is_org_member)
drop policy if exists "memberships_admin_write" on memberships;
create policy "memberships_admin_insert" on memberships for insert
  with check (is_org_admin(org_id));
create policy "memberships_admin_update" on memberships for update
  using (is_org_admin(org_id)) with check (is_org_admin(org_id));
create policy "memberships_admin_delete" on memberships for delete
  using (is_org_admin(org_id));

-- profiles (SELECT governed by profiles_read = true)
drop policy if exists "profiles_self_write" on profiles;
create policy "profiles_self_insert" on profiles for insert
  with check (user_id = (select auth.uid()));
create policy "profiles_self_update" on profiles for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "profiles_self_delete" on profiles for delete
  using (user_id = (select auth.uid()));

-- social_accounts (SELECT governed by social_accounts_read = is_org_member)
drop policy if exists "social_accounts_member_rw" on social_accounts;
create policy "social_accounts_member_insert" on social_accounts for insert
  with check (
    ((owner = 'member'::brand_owner) and owns_membership(membership_id) and is_org_member(org_id))
    or ((owner = 'org'::brand_owner) and is_org_admin(org_id))
  );
create policy "social_accounts_member_update" on social_accounts for update
  using (
    ((owner = 'member'::brand_owner) and owns_membership(membership_id))
    or ((owner = 'org'::brand_owner) and is_org_admin(org_id))
  )
  with check (
    ((owner = 'member'::brand_owner) and owns_membership(membership_id) and is_org_member(org_id))
    or ((owner = 'org'::brand_owner) and is_org_admin(org_id))
  );
create policy "social_accounts_member_delete" on social_accounts for delete
  using (
    ((owner = 'member'::brand_owner) and owns_membership(membership_id))
    or ((owner = 'org'::brand_owner) and is_org_admin(org_id))
  );
