-- ----------------------------------------------------------------------------
-- Lead capture / CRM.
--
--   lead_forms — a named capture form / landing page (public at /l/<slug>),
--                optionally tied to a listing or campaign.
--   leads      — captured contacts with source + a simple CRM status pipeline.
--
-- Org members manage both. Public landing pages may read active forms by slug
-- (anon SELECT); the capture itself is written server-side via the service-role
-- client (which bypasses RLS) after validating the slug → org.
-- ----------------------------------------------------------------------------
create table lead_forms (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  slug text not null unique,
  title text not null,
  kind text not null default 'general',   -- general | open_house | listing
  listing_id uuid references listings(id) on delete set null,
  marketing_campaign_id uuid references marketing_campaigns(id) on delete set null,
  headline text,
  subhead text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on lead_forms(org_id);

create table leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  lead_form_id uuid references lead_forms(id) on delete set null,
  listing_id uuid references listings(id) on delete set null,
  marketing_campaign_id uuid references marketing_campaigns(id) on delete set null,
  name text,
  email text,
  phone text,
  message text,
  source text,                          -- landing | open_house | qr | manual
  status text not null default 'new',   -- new | contacted | qualified | won | lost
  created_at timestamptz not null default now()
);
create index on leads(org_id);
create index on leads(lead_form_id);
create index on leads(org_id, status);

alter table lead_forms enable row level security;
alter table leads enable row level security;

create policy "lead_forms_rw" on lead_forms for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "leads_rw" on leads for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));

create policy "lead_forms_public_read" on lead_forms for select
  using (active = true);
