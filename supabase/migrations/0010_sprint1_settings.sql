-- Sprint 1: geographic settings, brand voice, and auto-approve for recurring jobs.

-- Add area + state to orgs so every market can configure its own locale.
-- Defaults keep existing NJ deployments working with zero data migration.
alter table orgs
  add column if not exists area  text not null default 'Monmouth County',
  add column if not exists state text not null default 'NJ';

-- Brand voice config: 5 short fields agents inject into every generation.
-- Stored as JSONB so fields are optional and extensible without more migrations.
alter table orgs
  add column if not exists brand_voice jsonb not null default '{}'::jsonb;

-- Auto-approve: when true on a recurring job, posts that pass the Fair Housing
-- gate are moved directly to 'scheduled' instead of sitting in the approval queue.
alter table recurring_jobs
  add column if not exists auto_approve boolean not null default false;
