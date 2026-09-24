import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { randomBytes } from "crypto";

/**
 * Route-level test for the Fair-Housing compliance override gate on
 * POST /api/posts/[id]/publish. Mirrors app/api/team/routes.test.ts's
 * pattern: mock getOrgContext (auth + role + org) and the Supabase server
 * client so the test exercises the route's authorization logic without a DB.
 *
 * publishPost() itself (lib/social/publish.ts) is exercised for real here,
 * not mocked out, so these tests also confirm the route's role check runs
 * *before* any compliance/publish work happens.
 */

vi.mock("@/lib/storage", () => ({
  signedUrl: async (_c: unknown, p: string) => `https://signed.example/${p}`,
  MEDIA_BUCKET: "media",
  orgPath: (...parts: string[]) => parts.join("/"),
}));

let mockCtx: any = null;

vi.mock("@/lib/org", () => ({
  getOrgContext: async () => mockCtx,
}));

const post = {
  id: "post-1",
  org_id: "org1",
  campaign_id: "camp-1",
  platform: "instagram",
  caption: "Just listed in Red Bank!",
  media_paths: ["org1/renders/a.png"],
  state: "scheduled",
};

// Campaign carries a Fair-Housing note, so publishing without an override
// must be blocked — this is what makes overrideCompliance meaningful to gate.
const campaignWithNotes = {
  copy: { compliance_notes: ["Avoid 'great for families' (familial status)."] },
};

/**
 * Same per-table dispatch shape as lib/social/publish.test.ts's mockSupabase,
 * wired in as the module createSupabaseServerClient returns.
 */
function makeSupabase() {
  const updates: any[] = [];
  return {
    from(table: string) {
      const builder: any = {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        order() {
          return this;
        },
        limit() {
          return this;
        },
        then(resolve: (v: any) => void) {
          if (table === "social_accounts") {
            resolve({ data: [], error: null }); // no connected account → manual export
          } else {
            resolve({ data: null, error: null });
          }
        },
        single: async () =>
          table === "posts" ? { data: post, error: null } : { data: null, error: null },
        maybeSingle: async () => {
          if (table === "campaigns") return { data: campaignWithNotes, error: null };
          if (table === "memberships") return { data: null, error: null };
          return { data: null, error: null };
        },
        update(values: any) {
          updates.push({ table, values });
          const chain: any = Promise.resolve({ data: null, error: null });
          chain.eq = () => chain;
          return { eq: () => chain };
        },
      };
      return builder;
    },
    _updates: updates,
  };
}

let supabaseInstance: ReturnType<typeof makeSupabase>;

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => supabaseInstance,
}));

function req(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/posts/post-1/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ADMIN = { userId: "u1", orgId: "org1", role: "owner" };
const MEMBER = { userId: "u2", orgId: "org1", role: "member" };

beforeEach(() => {
  process.env.SOCIAL_TOKEN_ENC_KEY = randomBytes(32).toString("base64");
  delete process.env.META_APP_ID;
  delete process.env.META_APP_SECRET;
  delete process.env.LINKEDIN_CLIENT_ID;
  delete process.env.LINKEDIN_CLIENT_SECRET;
  mockCtx = null;
  supabaseInstance = makeSupabase();
});

describe("POST /api/posts/[id]/publish — overrideCompliance authorization", () => {
  it("an org admin can override the Fair-Housing gate", async () => {
    const { POST } = await import("@/app/api/posts/[id]/publish/route");
    mockCtx = ADMIN;
    const res = await POST(req({ overrideCompliance: true }), { params: { id: "post-1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.state).toBe("published");
  });

  it("a non-admin member is rejected with 403 when requesting overrideCompliance, not silently downgraded", async () => {
    const { POST } = await import("@/app/api/posts/[id]/publish/route");
    mockCtx = MEMBER;
    const res = await POST(req({ overrideCompliance: true }), { params: { id: "post-1" } });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/admin/i);
    // Must not have proceeded to publish at all: no state should have been
    // written to "published" for this post.
    expect(
      supabaseInstance._updates.find((u: any) => u.values?.state === "published")
    ).toBeUndefined();
  });
});
