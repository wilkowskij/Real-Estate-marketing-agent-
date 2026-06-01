-- Stripe billing: subscriptions, usage metering, and webhook event audit.
-- One subscription per org (the org is the billing entity). RLS: org members
-- can read their org's billing; only the service role (webhooks) writes.

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free',          -- free | starter | pro | team | brokerage
  status text not null default 'inactive',     -- Stripe sub status (active, trialing, past_due, canceled, ...)
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  seats int,                                    -- seat allowance for team/brokerage
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id)
);
create index on subscriptions(org_id);
create index on subscriptions(stripe_customer_id);

-- Metered usage (AI generations, video renders, SMS) for usage-based billing.
create table usage_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  kind text not null,                           -- ai_generation | video_render | sms | image_generation
  quantity int not null default 1,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on usage_records(org_id);
create index on usage_records(org_id, kind, created_at);

-- Raw Stripe webhook events, for idempotency + audit.
create table billing_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique,                  -- dedupe: process each event once
  type text not null,
  org_id uuid references orgs(id) on delete set null,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index on billing_events(org_id);

alter table subscriptions enable row level security;
alter table usage_records enable row level security;
alter table billing_events enable row level security;

-- Members read their org's subscription + usage; writes are service-role only
-- (Stripe webhooks / metered recorders bypass RLS via the service key).
create policy "subscriptions_read" on subscriptions for select using (is_org_member(org_id));
create policy "usage_records_read" on usage_records for select using (is_org_member(org_id));
-- billing_events intentionally has NO policy: RLS on + no policy = members can't
-- read it; the service role (webhooks) bypasses RLS. Internal audit only.
