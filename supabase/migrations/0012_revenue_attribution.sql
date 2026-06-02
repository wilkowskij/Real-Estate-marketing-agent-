-- ----------------------------------------------------------------------------
-- Revenue attribution: post → click → lead → deal.
--
--   deals         — a lead that progressed toward (or to) a closing, carrying a
--                   durable source + campaign snapshot so revenue rolls up by
--                   what produced it.
--   tracked_links — a short link that logs a click then redirects (/r/<slug>),
--                   so a post/email CTA can be attributed. clicks is an atomic
--                   counter incremented by a SECURITY DEFINER function the public
--                   redirect calls.
-- ----------------------------------------------------------------------------
create table deals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  lead_id uuid references leads(id) on delete set null,
  marketing_campaign_id uuid references marketing_campaigns(id) on delete set null,
  listing_id uuid references listings(id) on delete set null,
  title text not null,
  value numeric,                              -- expected/closed commission (GCI)
  stage text not null default 'prospect',     -- prospect|appointment|agreement|under_contract|closed_won|closed_lost
  source text,                                -- snapshot of the lead's source at creation
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
create index on deals(org_id);
create index on deals(org_id, stage);
create index on deals(marketing_campaign_id);

create table tracked_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  slug text not null unique,
  destination text not null,
  label text,
  marketing_campaign_id uuid references marketing_campaigns(id) on delete set null,
  clicks int not null default 0,
  created_at timestamptz not null default now()
);
create index on tracked_links(org_id);
create index on tracked_links(marketing_campaign_id);

alter table deals enable row level security;
alter table tracked_links enable row level security;

create policy "deals_rw" on deals for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "tracked_links_rw" on tracked_links for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));

create or replace function increment_link_click(link_slug text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare dest text;
begin
  update tracked_links set clicks = clicks + 1 where slug = link_slug returning destination into dest;
  return dest;
end;
$$;
grant execute on function public.increment_link_click(text) to anon, authenticated;
