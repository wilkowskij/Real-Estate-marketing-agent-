-- ----------------------------------------------------------------------------
-- Campaign object: a named, multi-channel marketing campaign.
--
-- The existing `campaigns` table is a per-piece generation/render record (one
-- type → one copy package → one graphic). This adds the higher-level object the
-- agent thinks in: a NAMED campaign with a strategy that GROUPS many content
-- pieces across channels — social posts + email + SMS — around a listing or
-- theme (e.g. "14 Riverside Ave — Just Sold push").
--
--   marketing_campaigns  — the container (name + objective + listing + status)
--   campaign_messages    — persisted email/SMS pieces (social lives in `posts`)
--   posts.marketing_campaign_id — links a social post into a campaign
-- ----------------------------------------------------------------------------

create table marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  name text not null,
  listing_id uuid references listings(id) on delete set null,
  objective text,                          -- free-text strategy / goal
  status text not null default 'active',   -- active | completed | archived
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now()
);
create index on marketing_campaigns(org_id);

-- Persisted email / SMS pieces belonging to a campaign. Social pieces live in
-- `posts` (linked via posts.marketing_campaign_id); this gives the direct-to-
-- contact channels a durable home so a campaign can hold every channel.
create table campaign_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  marketing_campaign_id uuid references marketing_campaigns(id) on delete cascade,
  created_by uuid references auth.users(id),
  channel text not null,                   -- email | sms
  campaign_type campaign_type not null,
  content jsonb not null default '{}'::jsonb,  -- EmailCopy or SmsCopy shape
  state text not null default 'draft',     -- draft | approved | sent
  created_at timestamptz not null default now()
);
create index on campaign_messages(org_id);
create index on campaign_messages(marketing_campaign_id);

-- Link a social post into a campaign (nullable: standalone posts still allowed).
alter table posts
  add column marketing_campaign_id uuid references marketing_campaigns(id) on delete set null;
create index on posts(marketing_campaign_id);

-- RLS — org-scoped, same pattern as the other data tables.
alter table marketing_campaigns enable row level security;
alter table campaign_messages enable row level security;

create policy "marketing_campaigns_rw" on marketing_campaigns for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "campaign_messages_rw" on campaign_messages for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));
