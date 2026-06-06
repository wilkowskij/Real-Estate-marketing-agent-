-- Pending invitations sent to agents who haven't signed up yet.
-- When the agent accepts (via the emailed link), the app inserts a membership
-- and marks accepted_at.

CREATE TABLE org_invitations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid        NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  email         text        NOT NULL,
  role          text        NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  invited_by    uuid        NOT NULL REFERENCES auth.users(id),
  token         text        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at    timestamptz NOT NULL DEFAULT now() + interval '7 days',
  accepted_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX org_invitations_org_id_idx  ON org_invitations(org_id);
CREATE INDEX org_invitations_email_idx   ON org_invitations(email);
CREATE INDEX org_invitations_token_idx   ON org_invitations(token);

ALTER TABLE org_invitations ENABLE ROW LEVEL SECURITY;

-- Org admins can read, insert, and delete invitations for their org.
CREATE POLICY "admins_manage_invitations" ON org_invitations
  FOR ALL
  USING  (is_org_admin(org_id))
  WITH CHECK (is_org_admin(org_id));
