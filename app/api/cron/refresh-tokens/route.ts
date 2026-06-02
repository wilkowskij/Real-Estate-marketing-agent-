import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { refreshAccessToken, type Platform } from "@/lib/social/oauth";
import { encryptToken, decryptToken } from "@/lib/social/crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

const REFRESHABLE: Platform[] = ["instagram", "facebook", "linkedin", "twitter"];
// Refresh anything expiring within this window so a daily cron never lets a
// token lapse between runs.
const WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

/**
 * Refresh social tokens that are close to expiry. Authenticated with the
 * CRON_SECRET bearer token; uses the service-role client to act across orgs.
 * Best-effort per account — one failure doesn't stop the batch.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const cutoff = new Date(Date.now() + WINDOW_MS).toISOString();
  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("id, platform, access_token_enc, refresh_token_enc, expires_at")
    .lte("expires_at", cutoff)
    .not("expires_at", "is", null);

  const results: { id: string; platform: string; ok: boolean; error?: string }[] = [];
  for (const acct of accounts ?? []) {
    if (!REFRESHABLE.includes(acct.platform as Platform)) continue;
    try {
      const refreshed = await refreshAccessToken(acct.platform as Platform, {
        accessToken: acct.access_token_enc ? decryptToken(acct.access_token_enc) : undefined,
        refreshToken: acct.refresh_token_enc ? decryptToken(acct.refresh_token_enc) : undefined,
      });
      if (!refreshed) {
        results.push({ id: acct.id, platform: acct.platform, ok: false, error: "not refreshable" });
        continue;
      }
      await supabase
        .from("social_accounts")
        .update({
          access_token_enc: encryptToken(refreshed.accessToken),
          refresh_token_enc: refreshed.refreshToken ? encryptToken(refreshed.refreshToken) : acct.refresh_token_enc,
          expires_at: refreshed.expiresIn
            ? new Date(Date.now() + refreshed.expiresIn * 1000).toISOString()
            : null,
        })
        .eq("id", acct.id);
      results.push({ id: acct.id, platform: acct.platform, ok: true });
    } catch (e: any) {
      results.push({ id: acct.id, platform: acct.platform, ok: false, error: e.message });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
