import { NextRequest, NextResponse } from "next/server";
import { getOrgContext } from "@/lib/org";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { extractBrandFromDocument } from "@/lib/agents/brandExtract";
import { estimateCostUsd, MODEL } from "@/lib/anthropic/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024; // 15MB
const TEXT_TYPES = ["text/plain", "text/markdown"];

/**
 * Extract a brand kit from an uploaded brand-guidelines document (PDF or
 * text/markdown). Admin-only. Returns the structured brand for the admin to
 * review and save via PUT /api/brand — it does NOT auto-apply, so a human
 * always confirms colors/fonts before they go live for the whole company.
 */
export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return NextResponse.json({ error: "Only org admins can import a brand guide." }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 15MB)." }, { status: 400 });
  }

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isText =
    TEXT_TYPES.includes(file.type) || /\.(md|markdown|txt)$/i.test(file.name);
  if (!isPdf && !isText) {
    return NextResponse.json(
      { error: "Unsupported file. Upload a PDF, .md, or .txt brand guide." },
      { status: 400 }
    );
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const doc = isPdf
      ? ({ kind: "pdf", data: buf.toString("base64") } as const)
      : ({ kind: "text", data: buf.toString("utf8") } as const);

    const { brand, usage } = await extractBrandFromDocument(doc);

    // Best-effort audit of the extraction run.
    const supabase = createSupabaseServerClient();
    await supabase.from("agent_runs").insert({
      org_id: ctx.orgId,
      agent: "orchestrator",
      output: { brandExtract: brand } as any,
      input_tokens: usage.input,
      output_tokens: usage.output,
      cost_usd: estimateCostUsd(MODEL, usage.input, usage.output),
    });

    return NextResponse.json({ brand });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Extraction failed." }, { status: 500 });
  }
}
