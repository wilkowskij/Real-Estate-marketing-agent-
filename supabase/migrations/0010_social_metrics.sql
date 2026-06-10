-- ----------------------------------------------------------------------------
-- Analytics engine: per-post engagement snapshots.
--
-- The refresh-metrics cron writes one row per published post per run (via the
-- service-role client, which bypasses RLS). App users only need read access.
-- Fetchers per platform are stubs until insights API access is approved; the
-- table + cron + dashboard are live now and populate the moment a platform
-- ships a live fetcher.
-- ----------------------------------------------------------------------------
create table social_metrics (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  post_id uuid not null references posts(id) on delete cascade,
  platform text not null,
  captured_at timestamptz not null default now(),
  impressions int,
  reach int,
  likes int,
  comments int,
  shares int,
  saves int,
  clicks int,
  video_views int,
  raw jsonb not null default '{}'::jsonb
);
create index on social_metrics(org_id);
create index on social_metrics(post_id);
create index on social_metrics(org_id, captured_at);

alter table social_metrics enable row level security;

create policy "social_metrics_read" on social_metrics for select using (is_org_member(org_id));
