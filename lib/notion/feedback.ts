// Best-effort mirror of an in-app feedback submission into a Notion database,
// where the team triages + prioritizes. Uses the raw Notion REST API (no SDK
// dependency). Everything here is defensive: if Notion isn't configured or a
// call fails, we return null and the caller keeps the row in Postgres anyway.

import type { FeedbackType } from "@/lib/supabase/types";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

/** Whether the Notion mirror is configured. */
export function notionConfigured(): boolean {
  return Boolean(process.env.NOTION_API_KEY && process.env.NOTION_FEEDBACK_DB_ID);
}

const TYPE_LABEL: Record<FeedbackType, string> = {
  bug: "Bug",
  feedback: "Feedback",
  feature: "Feature request",
};

export interface FeedbackForNotion {
  type: FeedbackType;
  subject: string;
  message: string;
  contactEmail?: string | null;
  pageUrl?: string | null;
  orgId: string;
  userId: string;
}

interface NotionDbProps {
  /** Name of the database's title property (varies per DB). */
  titleProp: string;
  /** Names of select properties present, keyed lowercase → actual name. */
  selects: Record<string, string>;
  /** Names of email properties present, keyed lowercase → actual name. */
  emails: Record<string, string>;
}

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

/**
 * Introspect the target database so we set properties that actually exist.
 * Notion rejects a page create that references an unknown property, and the
 * title property's name is author-defined, so we discover both up front.
 */
async function describeDatabase(dbId: string): Promise<NotionDbProps | null> {
  const res = await fetch(`${NOTION_API}/databases/${dbId}`, { headers: headers() });
  if (!res.ok) return null;
  const db = (await res.json()) as {
    properties?: Record<string, { type: string }>;
  };
  const props = db.properties ?? {};
  let titleProp = "Name";
  const selects: Record<string, string> = {};
  const emails: Record<string, string> = {};
  for (const [name, def] of Object.entries(props)) {
    if (def.type === "title") titleProp = name;
    else if (def.type === "select") selects[name.toLowerCase()] = name;
    else if (def.type === "email") emails[name.toLowerCase()] = name;
  }
  return { titleProp, selects, emails };
}

function paragraph(text: string) {
  return {
    object: "block",
    type: "paragraph",
    paragraph: { rich_text: [{ type: "text", text: { content: text.slice(0, 1900) } }] },
  };
}

/**
 * Create a Notion page for a feedback submission. Returns the new page id (and
 * url) on success, or null if Notion is unconfigured or the call fails.
 */
export async function createFeedbackPage(
  fb: FeedbackForNotion
): Promise<{ pageId: string; url: string | null } | null> {
  if (!notionConfigured()) return null;
  const dbId = process.env.NOTION_FEEDBACK_DB_ID as string;

  try {
    const schema = await describeDatabase(dbId);
    if (!schema) return null;

    const title = fb.subject.trim() || fb.message.trim().slice(0, 60) || "Feedback";
    // The title property is always present; select/email props only if the DB
    // defines them (matched case-insensitively against common names).
    const properties: Record<string, unknown> = {
      [schema.titleProp]: { title: [{ type: "text", text: { content: title.slice(0, 200) } }] },
    };
    const typeProp = schema.selects["type"] ?? schema.selects["category"];
    if (typeProp) properties[typeProp] = { select: { name: TYPE_LABEL[fb.type] } };
    const statusProp = schema.selects["status"] ?? schema.selects["stage"];
    if (statusProp) properties[statusProp] = { select: { name: "New" } };
    if (fb.contactEmail) {
      // Prefer an obviously-named email prop, else the first email prop the DB has.
      const emailProp =
        schema.emails["email"] ?? schema.emails["contact"] ?? Object.values(schema.emails)[0];
      if (emailProp) properties[emailProp] = { email: fb.contactEmail };
    }

    // Everything useful also goes in the page body so it survives regardless of
    // which optional properties the DB happens to define.
    const children = [
      paragraph(`Type: ${TYPE_LABEL[fb.type]}`),
      paragraph(fb.message),
      fb.contactEmail ? paragraph(`Contact: ${fb.contactEmail}`) : null,
      fb.pageUrl ? paragraph(`Submitted from: ${fb.pageUrl}`) : null,
      paragraph(`Org: ${fb.orgId} · User: ${fb.userId}`),
    ].filter(Boolean);

    const res = await fetch(`${NOTION_API}/pages`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ parent: { database_id: dbId }, properties, children }),
    });
    if (!res.ok) return null;
    const page = (await res.json()) as { id: string; url?: string };
    return { pageId: page.id, url: page.url ?? null };
  } catch {
    return null;
  }
}
