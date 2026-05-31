import { SupabaseClient } from "@supabase/supabase-js";

export const MEDIA_BUCKET = "media";

/** Build the org-namespaced storage path that the Storage RLS policy expects. */
export function orgPath(orgId: string, ...parts: string[]): string {
  return [orgId, ...parts].join("/");
}

/** Create a short-lived signed URL for a private object (for vision + rendering). */
export async function signedUrl(
  supabase: SupabaseClient,
  path: string | null | undefined,
  expiresIn = 600
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}
