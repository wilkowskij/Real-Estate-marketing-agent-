-- Real Estate Marketing Agent — initial schema
-- Multi-tenant (orgs + memberships) with org-or-member-owned brand kits.
-- RLS is keyed to org membership; "locked" brand fields are enforced in app code
-- (service role) since column-level locking is policy-awkward.

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type member_role as enum ('owner', 'admin', 'member');
create type campaign_type as enum ('just_sold', 'new_listing', 'open_house', 'custom');
create type post_state as enum ('draft', 'approved', 'scheduled', 'published', 'failed');
create type listing_status as enum ('active', 'pending', 'sold', 'coming_soon');
create type brand_owner as enum ('org', 'member');

-- ----------------------------------------------------------------------------
-- Orgs & membership
-- ----------------------------------------------------------------------------
create table orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_solo boolean not null default false,    -- auto-created org for a solo signup
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create index on memberships(user_id);
create index on memberships(org_id);

-- Helper: is the current user a member of this org?
create or replace function is_org_member(target_org uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.org_id = target_org and m.user_id = auth.uid()
  );
$$;

-- Helper: is the current user an owner/admin of this org?
create or replace function is_org_admin(target_org uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.org_id = target_org and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  );
$$;

-- ----------------------------------------------------------------------------
-- Profiles (per individual user)
-- ----------------------------------------------------------------------------
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  license_number text,
  headshot_path text,                 -- Supabase Storage path
  contact_block jsonb not null default '{}'::jsonb,  -- phone, email, website
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Brand kits (owned by an org OR a membership)
-- ----------------------------------------------------------------------------
create table brand_kits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  owner brand_owner not null,
  membership_id uuid references memberships(id) on delete cascade,  -- when owner='member'
  name text not null default 'Default',
  logo_light_path text,
  logo_dark_path text,
  -- Luxe Ivory & Gold defaults: charcoal primary, beige secondary, gold accent
  colors jsonb not null default '{"primary":"#2C2C2C","secondary":"#EDE4D5","accent":"#C9A96E"}'::jsonb,
  fonts jsonb not null default '{"heading":"Playfair Display","body":"Inter"}'::jsonb,
  disclaimer text,
  layout_theme text not null default 'classic',
  -- org-level kits can lock fields so members cannot override them
  locked_fields text[] not null default '{}',
  is_default boolean not null default true,
  created_at timestamptz not null default now(),
  -- a member kit must reference a membership; an org kit must not
  check ((owner = 'member') = (membership_id is not null))
);

create index on brand_kits(org_id);
create index on brand_kits(membership_id);

-- ----------------------------------------------------------------------------
-- Listings & assets
-- ----------------------------------------------------------------------------
create table listings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  address text not null,
  town text,
  state text not null default 'NJ',
  county text not null default 'Monmouth',
  price numeric,
  beds int,
  baths numeric,
  sqft int,
  status listing_status not null default 'active',
  description text,
  created_at timestamptz not null default now()
);

create index on listings(org_id);

create table assets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  listing_id uuid references listings(id) on delete cascade,
  storage_path text not null,         -- path in the 'media' bucket
  kind text not null default 'photo', -- photo | ai_enhanced | rendered
  width int,
  height int,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index on assets(org_id);
create index on assets(listing_id);

-- ----------------------------------------------------------------------------
-- Campaigns & posts
-- ----------------------------------------------------------------------------
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  listing_id uuid references listings(id) on delete set null,
  type campaign_type not null,
  copy jsonb not null default '{}'::jsonb,      -- {headline, caption, cta, hashtags[], compliance_notes}
  brand_kit_id uuid references brand_kits(id),
  rendered_asset_id uuid references assets(id),
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create index on campaigns(org_id);

create table posts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  platform text not null,             -- instagram | facebook | linkedin | x
  caption text,
  media_paths text[] not null default '{}',
  scheduled_at timestamptz,
  state post_state not null default 'draft',
  platform_post_id text,
  error text,
  created_at timestamptz not null default now()
);

create index on posts(org_id);
create index on posts(state);
create index on posts(scheduled_at);

-- ----------------------------------------------------------------------------
-- Social accounts (OAuth tokens; encrypted at app layer)
-- ----------------------------------------------------------------------------
create table social_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  owner brand_owner not null default 'org',
  membership_id uuid references memberships(id) on delete cascade,
  platform text not null,
  account_label text,
  access_token_enc text,              -- encrypted
  refresh_token_enc text,             -- encrypted
  expires_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index on social_accounts(org_id);

-- ----------------------------------------------------------------------------
-- Automation: recurring jobs, trends, agent run audit
-- ----------------------------------------------------------------------------
create table recurring_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  kind text not null,                 -- local_news | trend_watch
  cadence text not null default 'weekly',
  config jsonb not null default '{}'::jsonb,
  auto_publish boolean not null default false,
  enabled boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);

create index on recurring_jobs(org_id);

create table trends (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  topic text not null,
  source text,
  relevance numeric,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete set null,
  agent text not null,                -- marketing | design | orchestrator
  input jsonb,
  output jsonb,
  tool_calls jsonb,
  input_tokens int,
  output_tokens int,
  cost_usd numeric,
  created_at timestamptz not null default now()
);

create index on agent_runs(org_id);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table orgs enable row level security;
alter table memberships enable row level security;
alter table profiles enable row level security;
alter table brand_kits enable row level security;
alter table listings enable row level security;
alter table assets enable row level security;
alter table campaigns enable row level security;
alter table posts enable row level security;
alter table social_accounts enable row level security;
alter table recurring_jobs enable row level security;
alter table trends enable row level security;
alter table agent_runs enable row level security;

-- orgs: members can read; admins can update
create policy "orgs_read" on orgs for select using (is_org_member(id));
create policy "orgs_update" on orgs for update using (is_org_admin(id));

-- memberships: a user sees memberships of orgs they belong to; admins manage
create policy "memberships_read" on memberships for select using (is_org_member(org_id));
create policy "memberships_admin_write" on memberships for all
  using (is_org_admin(org_id)) with check (is_org_admin(org_id));

-- profiles: a user manages their own profile, members can read each other
create policy "profiles_self_write" on profiles for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "profiles_read" on profiles for select using (true);

-- Generic org-scoped policy applied to the data tables
create policy "brand_kits_rw" on brand_kits for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "listings_rw" on listings for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "assets_rw" on assets for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "campaigns_rw" on campaigns for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "posts_rw" on posts for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "social_accounts_rw" on social_accounts for all
  using (is_org_admin(org_id)) with check (is_org_admin(org_id));
create policy "recurring_jobs_rw" on recurring_jobs for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "trends_read" on trends for select using (org_id is null or is_org_member(org_id));
create policy "agent_runs_read" on agent_runs for select using (is_org_member(org_id));

-- ----------------------------------------------------------------------------
-- New-user bootstrap: auto-create a solo org + membership + profile + brand kit
-- ----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_org uuid;
  new_membership uuid;
begin
  insert into orgs (name, is_solo) values (coalesce(new.email, 'My Org'), true)
    returning id into new_org;

  insert into memberships (org_id, user_id, role) values (new_org, new.id, 'owner')
    returning id into new_membership;

  insert into profiles (user_id, full_name) values (new.id, new.raw_user_meta_data->>'full_name');

  insert into brand_kits (org_id, owner, membership_id, name, is_default)
    values (new_org, 'org', null, 'Default', true);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
