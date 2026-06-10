-- ----------------------------------------------------------------------------
-- Scale prep (from the Supabase performance advisor — see docs/SCALABILITY.md).
--
-- 1. Covering indexes for query/join-facing foreign keys. Additive, zero risk;
--    helps joins, lookups, and cascade deletes as data grows.
-- 2. Fix the profiles RLS init-plan so auth.uid() is evaluated once per query
--    instead of once per row. Behaviour-identical (profiles SELECT stays open
--    via profiles_read = true; this policy only governs self-writes).
-- ----------------------------------------------------------------------------
create index if not exists idx_leads_marketing_campaign_id on leads(marketing_campaign_id);
create index if not exists idx_deals_lead_id on deals(lead_id);
create index if not exists idx_deals_listing_id on deals(listing_id);
create index if not exists idx_lead_forms_marketing_campaign_id on lead_forms(marketing_campaign_id);
create index if not exists idx_lead_forms_listing_id on lead_forms(listing_id);
create index if not exists idx_posts_campaign_id on posts(campaign_id);
create index if not exists idx_social_accounts_membership_id on social_accounts(membership_id);
create index if not exists idx_trends_org_id on trends(org_id);
create index if not exists idx_campaigns_listing_id on campaigns(listing_id);

drop policy if exists "profiles_self_write" on profiles;
create policy "profiles_self_write" on profiles for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
