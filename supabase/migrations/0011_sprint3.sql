-- Sprint 3: social_metrics table (Phase 2 analytics prep)
-- and brokerage content push columns on posts.

-- ---------------------------------------------------------------------------
-- social_metrics: stores per-post engagement pulled from platform APIs.
-- Populated by the /api/cron/pull-metrics job once OAuth tokens are approved.
-- ---------------------------------------------------------------------------
create table if not exists social_metrics (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs(id) on delete cascade,
  post_id      uuid not null references posts(id) on delete cascade,
  platform     text not null,
  metric       text not null,  -- "impressions" | "reach" | "likes" | "comments" | "shares"
  value        bigint not null default 0,
  captured_at  timestamptz not null default now()
);

create index if not exists social_metrics_post_id_idx    on social_metrics(post_id);
create index if not exists social_metrics_captured_at_idx on social_metrics(captured_at desc);

alter table social_metrics enable row level security;

create policy "org members can view their metrics"
  on social_metrics for select
  using (is_org_member(org_id));

create policy "service can insert metrics"
  on social_metrics for insert
  with check (is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- Brokerage content push: admins mark posts for team distribution.
-- ---------------------------------------------------------------------------
alter table posts
  add column if not exists is_brokerage_push boolean not null default false,
  add column if not exists source_post_id    uuid    references posts(id) on delete set null;

create index if not exists posts_brokerage_push_idx
  on posts(org_id, is_brokerage_push)
  where is_brokerage_push = true;
