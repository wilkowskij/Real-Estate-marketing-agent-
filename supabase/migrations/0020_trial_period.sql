-- Free-trial support: add trial_ends_at to subscriptions and auto-provision a
-- 14-day trial for every new org so new users get Solo-tier features on sign-up.

alter table subscriptions add column if not exists trial_ends_at timestamptz;

-- Trigger: insert a trialing subscription row when a new org is created.
-- Uses ON CONFLICT DO NOTHING so manually-created rows are never clobbered.
create or replace function public.provision_org_trial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (org_id, plan, status, trial_ends_at)
  values (new.id, 'free', 'trialing', now() + interval '14 days')
  on conflict (org_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_org_created on public.orgs;
create trigger on_org_created
  after insert on public.orgs
  for each row
  execute function public.provision_org_trial();
