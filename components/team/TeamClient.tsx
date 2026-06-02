"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Label, Input, Select } from "@/components/ui/Field";
import { LOCKABLE_FIELDS, type LockableField } from "@/lib/branding/resolveBrand";

export interface TeamMember {
  membershipId: string;
  userId: string;
  role: string;
  fullName: string | null;
}

/** Human labels for the lockable brand fields. */
const FIELD_LABELS: Record<LockableField, string> = {
  logo_light_path: "Logo (light bg)",
  logo_dark_path: "Logo (dark bg)",
  colors: "Brand colors",
  fonts: "Fonts",
  disclaimer: "Disclaimer / brokerage line",
  layout_theme: "Layout theme",
};

/**
 * Team / org management. Admins invite agents, change roles, remove members,
 * and lock brand fields. Members see a read-only roster + the locked fields.
 */
export function TeamClient({
  members,
  currentUserId,
  isAdmin,
  lockedFields,
}: {
  members: TeamMember[];
  currentUserId: string;
  isAdmin: boolean;
  lockedFields: string[];
}) {
  return (
    <>
      <MembersCard members={members} currentUserId={currentUserId} isAdmin={isAdmin} />
      <LocksCard isAdmin={isAdmin} lockedFields={lockedFields} />
    </>
  );
}

/** Roster + invite control. */
function MembersCard({
  members,
  currentUserId,
  isAdmin,
}: {
  members: TeamMember[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function invite() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Invite failed");
      setEmail("");
      setMsg("Agent added.");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-8">
      <CardBody>
        <h3 className="text-lg text-navy">Members</h3>

        <div className="mt-4 divide-y divide-paper-line">
          {members.map((m) => (
            <MemberRow
              key={m.membershipId}
              member={m}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          ))}
        </div>

        {isAdmin && (
          <div className="mt-6 border-t border-paper-line pt-6">
            <h4 className="text-sm font-semibold text-ink">Invite agent</h4>
            <p className="mt-1 text-xs text-ink-muted">
              The agent must already have an account. We'll add them to this org by email.
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent@brokerage.com"
                />
              </div>
              <div className="sm:w-40">
                <Label>Role</Label>
                <Select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "member" | "admin")}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </Select>
              </div>
              <Button variant="gold" onClick={invite} disabled={busy || !email}>
                {busy ? "Adding…" : "Invite agent"}
              </Button>
            </div>
            {error && <p className="mt-2 text-sm text-error">{error}</p>}
            {msg && <p className="mt-2 text-sm text-ink-muted">{msg}</p>}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/** One member row, with role controls for admins acting on others. */
function MemberRow({
  member,
  currentUserId,
  isAdmin,
}: {
  member: TeamMember;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSelf = member.userId === currentUserId;
  const isOwner = member.role === "owner";
  // Admins can manage other, non-owner members only.
  const canManage = isAdmin && !isSelf && !isOwner;

  async function changeRole(role: "member" | "admin") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/team/members/${member.membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Failed");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/team/members/${member.membershipId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Failed");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-gold to-gold-deep" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">
              {member.fullName ?? "Unknown"}
              {isSelf && <span className="ml-1 text-ink-muted">(you)</span>}
            </p>
            <p className="text-xs capitalize text-ink-muted">{member.role}</p>
          </div>
        </div>

        {canManage ? (
          <div className="flex shrink-0 items-center gap-2">
            <Select
              className="h-9 w-32"
              value={member.role}
              onChange={(e) => changeRole(e.target.value as "member" | "admin")}
              disabled={busy}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </Select>
            <Button variant="ghost" size="sm" onClick={remove} disabled={busy}>
              Remove
            </Button>
          </div>
        ) : (
          <Badge className="capitalize">{member.role}</Badge>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}

/** Locked-field controls (admins) or read-only summary (members). */
function LocksCard({ isAdmin, lockedFields }: { isAdmin: boolean; lockedFields: string[] }) {
  const router = useRouter();
  const [locked, setLocked] = useState<Set<string>>(new Set(lockedFields));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(field: LockableField) {
    setLocked((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }

  async function save() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/team/locks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lockedFields: Array.from(locked) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Save failed");
      setMsg("Saved.");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-6">
      <CardBody>
        <h3 className="text-lg text-navy">Locked brand fields</h3>
        <p className="mt-3 text-sm text-ink-muted">
          Locked fields are inherited by every member and cannot be overridden.
          Personal details (headshot, contact) always belong to each agent.
        </p>

        {isAdmin ? (
          <>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {LOCKABLE_FIELDS.map((field) => (
                <label
                  key={field}
                  className="flex items-center gap-2 rounded-lg border border-paper-line bg-white px-3 py-2.5 text-sm text-ink"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-gold"
                    checked={locked.has(field)}
                    onChange={() => toggle(field)}
                  />
                  {FIELD_LABELS[field]}
                </label>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-end gap-3">
              {error && <p className="text-sm text-error">{error}</p>}
              {msg && <p className="text-sm text-ink-muted">{msg}</p>}
              <Button variant="gold" onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save locks"}
              </Button>
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-ink">
            {lockedFields.length > 0 ? (
              <>
                Your org has locked:{" "}
                <span className="font-medium">
                  {lockedFields
                    .map((f) => FIELD_LABELS[f as LockableField] ?? f)
                    .join(", ")}
                </span>
                .
              </>
            ) : (
              "Your org has not locked any brand fields — you can personalize everything."
            )}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
