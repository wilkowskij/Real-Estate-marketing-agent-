import { describe, it, expect, beforeAll, vi } from "vitest";
import { randomBytes } from "crypto";

// publish.ts imports "@/lib/storage" (signedUrl) — stub it so no real Storage call.
vi.mock("@/lib/storage", () => ({
  signedUrl: async (_c: unknown, p: string) => `https://signed.example/${p}`,
  MEDIA_BUCKET: "media",
  orgPath: (...parts: string[]) => parts.join("/"),
}));

import { encryptToken } from "./crypto";
import { publishPost } from "./publish";

beforeAll(() => {
  process.env.SOCIAL_TOKEN_ENC_KEY = randomBytes(32).toString("base64");
  // No platform OAuth configured → publishers stay as ManualExport (live=false).
  delete process.env.META_APP_ID;
  delete process.env.META_APP_SECRET;
  delete process.env.LINKEDIN_CLIENT_ID;
  delete process.env.LINKEDIN_CLIENT_SECRET;
});

/**
 * Minimal chainable mock of the Supabase query builder for the calls publishPost
 * makes: posts.select().eq().single(), social_accounts...maybeSingle(),
 * posts.update().eq().
 */
function mockSupabase(opts: { post: any; account: any }) {
  const updates: any[] = [];
  const api: any = {
    from(table: string) {
      return {
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
        single: async () =>
          table === "posts" ? { data: opts.post, error: null } : { data: null, error: null },
        maybeSingle: async () => ({ data: opts.account, error: null }),
        update(values: any) {
          updates.push({ table, values });
          return { eq: async () => ({ data: null, error: null }) };
        },
      };
    },
    _updates: updates,
  };
  return api;
}

const basePost = {
  id: "post-1",
  org_id: "org-1",
  platform: "instagram",
  caption: "Just listed in Red Bank!",
  media_paths: ["org-1/renders/a.png"],
  state: "scheduled",
};

describe("publishPost", () => {
  it("uses manual export when the platform isn't live, marking it published", async () => {
    const sb = mockSupabase({ post: basePost, account: null });
    const res = await publishPost(sb, "post-1");
    expect(res.ok).toBe(true);
    expect(res.state).toBe("published");
    // exportUrl is the (signed) media URL for the agent to post by hand
    expect(res.exportUrl).toContain("signed.example");
    expect(sb._updates[0].values.state).toBe("published");
  });

  it("returns not-found for a missing post", async () => {
    const sb = mockSupabase({ post: null, account: null });
    const res = await publishPost(sb, "missing");
    expect(res.ok).toBe(false);
    expect(res.state).toBe("failed");
  });

  it("decrypts a stored token without throwing (manual path ignores it)", async () => {
    const account = {
      access_token_enc: encryptToken("secret-token"),
      meta: { igUserId: "123" },
    };
    const sb = mockSupabase({ post: basePost, account });
    const res = await publishPost(sb, "post-1");
    expect(res.ok).toBe(true);
  });
});
