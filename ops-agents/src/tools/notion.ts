import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { env } from "../env";
import { fail, text, type OpsTool } from "./types";

/** Support lane — search the internal Notion knowledge base. Read-only. */
export function notionTools(): OpsTool[] {
  if (!env.notion.apiKey) return [];

  return [
    {
      name: "notion_search",
      gated: false,
      def: tool(
        "notion_search",
        "Search the internal Notion knowledge base for pages relevant to a support question.",
        { query: z.string().describe("Search terms"), limit: z.number().int().min(1).max(20).default(5) },
        async ({ query, limit }) => {
          try {
            const res = await fetch("https://api.notion.com/v1/search", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${env.notion.apiKey}`,
                "Notion-Version": "2022-06-28",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ query, page_size: limit }),
            });
            if (!res.ok) return fail(`Notion ${res.status}: ${await res.text()}`);
            const json = (await res.json()) as any;
            const results = (json.results ?? []) as any[];
            if (!results.length) return text("No matching pages.");
            return text(
              results
                .map((r) => {
                  const title =
                    Object.values(r.properties ?? {})
                      .flatMap((p: any) => p?.title ?? [])
                      .map((t: any) => t?.plain_text)
                      .join("") || "(untitled)";
                  return `${title} — ${r.url}`;
                })
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
