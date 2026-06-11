-- Org invite tokens: one persistent invite link per org that admins can rotate.
-- Any agent with the link can join as a member (or the role the admin configured).
-- No expiry — valid until rotated. Public endpoints resolve brand info from token.

create table org_invite_tokens (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references orgs(id) on delete cascade,
  token      text not null unique default encode(gen_random_bytes(24), 'hex'),
  role       text not null default 'member',
  created_at timestamptz not null default now(),
  unique (org_id)   -- one active link per org; rotate = upsert
);

create index on org_invite_tokens(token);

-- Public read: anyone with the token can resolve the org's display info.
-- Writes are service-role only (the invite-link API).
alter table org_invite_tokens enable row level security;
create policy "invite_tokens_read_own" on org_invite_tokens
  for select using (is_org_member(org_id));
