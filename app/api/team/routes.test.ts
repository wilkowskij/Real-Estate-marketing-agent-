import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Route-level integration tests for the admin-gated team/brand routes.
 * We mock getOrgContext (auth + role + org) and the Supabase server client so
 * the tests exercise the routes' authorization + validation logic without a DB.
 */

// --- Mutable mock state, configured per test ---
let mockCtx: any = null;
const captured: { table?: string; op?: string; values?: any; eqs: any[] } = { eqs: [] };

vi.mock("@/lib/org", () => ({
  getOrgContext: async () => mockCtx,
}));

// Chainable query-builder stub that records the last write.
function builder() {
  const chain: any = {
    update(values: any) {
      captured.op = "update";
      captured.values = values;
      return chain;
    },
    insert(values: any) {
      captured.op = "insert";
      captured.values = values;
      return chain;
    },
    upsert(values: any) {
      captured.op = "upsert";
      captured.values = values;
      return chain;
    },
    delete() {
      captured.op = "delete";
      return chain;
    },
    select() {
      return chain;
    },
    eq(col: string, val: any) {
      captured.eqs.push([col, val]);
      return chain;
    },
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: { id: "new-id" }, error: null }),
    then: (resolve: any) => resolve({ data: null, error: null }),
  };
  return chain;
}

const adminListUsers = vi.fn(async () => ({ data: { users: [] as any[] }, error: null }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    from(table: string) {
      captured.table = table;
      return builder();
    },
  }),
  createSupabaseAdminClient: () => ({
    auth: { admin: { listUsers: adminListUsers } },
    from(table: string) {
      captured.table = table;
      return builder();
    },
  }),
}));

function req(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockCtx = null;
  captured.table = undefined;
  captured.op = undefined;
  captured.values = undefined;
  captured.eqs = [];
  adminListUsers.mockClear();
});

const ADMIN = { userId: "u1", orgId: "org1", role: "owner", orgKit: { id: "kit1" } };
const MEMBER = { userId: "u2", orgId: "org1", role: "member", orgKit: { id: "kit1" } };

describe("PUT /api/team/locks", () => {
  it("401 when unauthenticated", async () => {
    const { PUT } = await import("@/app/api/team/locks/route");
    mockCtx = null;
    const res = await PUT(req({ lockedFields: ["colors"] }));
    expect(res.status).toBe(401);
  });

  it("403 for a non-admin member", async () => {
    const { PUT } = await import("@/app/api/team/locks/route");
    mockCtx = MEMBER;
    const res = await PUT(req({ lockedFields: ["colors"] }));
    expect(res.status).toBe(403);
  });

  it("400 on an invalid lock field", async () => {
    const { PUT } = await import("@/app/api/team/locks/route");
    mockCtx = ADMIN;
    const res = await PUT(req({ lockedFields: ["not_a_field"] }));
    expect(res.status).toBe(400);
  });

  it("admin writes deduped, canonical locked_fields to the org kit", async () => {
    const { PUT } = await import("@/app/api/team/locks/route");
    mockCtx = ADMIN;
    const res = await PUT(req({ lockedFields: ["colors", "colors", "fonts"] }));
    expect(res.status).toBe(200);
    expect(captured.table).toBe("brand_kits");
    expect(captured.op).toBe("update");
    expect(captured.values.locked_fields).toEqual(["colors", "fonts"]);
    expect(captured.eqs).toContainEqual(["id", "kit1"]);
  });
});

describe("PUT /api/brand", () => {
  it("403 when a member tries to change company brand fields", async () => {
    const { PUT } = await import("@/app/api/brand/route");
    mockCtx = MEMBER;
    const res = await PUT(req({ name: "New Co", colors: { primary: "#000", secondary: "#111", accent: "#222" } }));
    expect(res.status).toBe(403);
  });

  it("lets a member update only their own profile fields", async () => {
    const { PUT } = await import("@/app/api/brand/route");
    mockCtx = MEMBER;
    const res = await PUT(req({ fullName: "Jane Agent", licenseNumber: "NJ-1" }));
    expect(res.status).toBe(200);
    // last write should target profiles (upsert), not brand_kits
    expect(captured.table).toBe("profiles");
  });
});

describe("POST /api/team/invite", () => {
  it("403 for a non-admin", async () => {
    const { POST } = await import("@/app/api/team/invite/route");
    mockCtx = MEMBER;
    const res = await POST(req({ email: "x@y.com", role: "member" }));
    expect(res.status).toBe(403);
  });

  it("404 when no user exists for the email", async () => {
    const { POST } = await import("@/app/api/team/invite/route");
    mockCtx = ADMIN;
    adminListUsers.mockResolvedValueOnce({ data: { users: [] }, error: null });
    const res = await POST(req({ email: "missing@nobody.com", role: "member" }));
    expect(res.status).toBe(404);
  });

  it("400 on a malformed email", async () => {
    const { POST } = await import("@/app/api/team/invite/route");
    mockCtx = ADMIN;
    const res = await POST(req({ email: "not-an-email", role: "member" }));
    expect(res.status).toBe(400);
  });
});
