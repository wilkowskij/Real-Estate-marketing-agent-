-- ----------------------------------------------------------------------------
-- Support / feedback.
--
--   feedback — a bug report, general feedback, or feature request submitted by a
--              signed-in customer from the in-app Support widget. Each row is
--              org-scoped and, when Notion is configured, mirrored into a Notion
--              database (notion_page_id) where the team triages + prioritizes.
--
-- Org members read + write their own org's feedback (RLS via is_org_member).
-- The Notion mirror is best-effort and happens server-side after the insert;
-- failure to reach Notion never blocks capture.
-- ----------------------------------------------------------------------------
create table feedback (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  type text not null default 'feedback',   -- bug | feedback | feature
  subject text not null,
  message text not null,
  contact_email text,                       -- optional reply-to the customer typed
  page_url text,                            -- where in the app they were
  status text not null default 'new',       -- new | triaged | planned | done | wont_do
  notion_page_id text,                      -- set once mirrored to Notion
  notion_synced_at timestamptz,
  created_at timestamptz not null default now()
);
create index on feedback(org_id);
create index on feedback(org_id, status);

alter table feedback enable row level security;

create policy "feedback_rw" on feedback for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));
