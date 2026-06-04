import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { env } from "../env";
import { fail, text, type OpsTool } from "./types";

/** Dev lane — recent unresolved production errors from Sentry. Read-only. */
export function sentryTools(): OpsTool[] {
  const { token, org, project } = env.sentry;
  if (!token || !org || !project) return [];

  return [
    {
      name: "sentry_list_issues",
      gated: false,
      def: tool(
        "sentry_list_issues",
        `List recent unresolved Sentry issues for ${org}/${project}.`,
        { limit: z.number().int().min(1).max(25).default(10) },
        async ({ limit }) => {
          try {
            const url = `https://sentry.io/api/0/projects/${org}/${project}/issues/?query=is:unresolved&statsPeriod=24h&limit=${limit}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) return fail(`Sentry ${res.status}: ${await res.text()}`);
            const issues = (await res.json()) as any[];
            if (!issues.length) return text("No unresolved issues in the last 24h. 🎉");
            return text(
              issues
                .map((i) => `[${i.count}×] ${i.title} (last: ${i.lastSeen}) — ${i.permalink}`)
                .join("\n")
            );
          } catch (e: any) {
            return fail(e.message);
          }
        }
      ),
    },
  ];
}
