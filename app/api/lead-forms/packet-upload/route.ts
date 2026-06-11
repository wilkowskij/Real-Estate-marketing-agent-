import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { MEDIA_BUCKET } from "@/lib/storage";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Accepts a PDF upload (multipart/form-data, field name "file") and stores it
 * in the media bucket under {orgId}/packets/{uuid}.pdf. Returns the storage path.
 */
export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "PDF must be 20 MB or smaller." }, { status: 400 });
  }

  const id = randomBytes(12).toString("hex");
  const path = `${ctx.orgId}/packets/${id}.pdf`;

  // Use the admin client so the upload isn't blocked by anon-key rate limits,
  // but verify org membership above (via getOrgContext) before proceeding.
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, Buffer.from(arrayBuffer), {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ path });
}
