-- ----------------------------------------------------------------------------
-- Make `listings` a first-class, reusable record (not just an inline byproduct
-- of generating a campaign). Adds the fields an MLS-imported listing carries so
-- it can be saved once and reused across campaigns, and so future syncs can
-- dedupe + refresh price/status by MLS number.
--
--   zip            — postal code (RentCast returns it; we didn't store it)
--   mls_number     — the MLS listing id, used to dedupe saves + future refresh
--   source         — where the row came from: 'mls' | 'manual' | 'campaign'
--   last_synced_at — when we last refreshed it from the MLS provider
--
-- RLS is unchanged (already org-scoped via is_org_member on listings).
-- ----------------------------------------------------------------------------
alter table listings add column if not exists zip text;
alter table listings add column if not exists mls_number text;
alter table listings add column if not exists source text not null default 'manual';
alter table listings add column if not exists last_synced_at timestamptz;

-- Dedupe saved MLS listings within an org by their MLS number.
create unique index if not exists listings_org_mls_number_key
  on listings(org_id, mls_number)
  where mls_number is not null;
