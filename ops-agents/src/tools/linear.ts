import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { env } from "../env";
import { fail, text, type OpsTool } from "./types";

const GRAPHQL = "https://api.linear.app/graphql";

async function linear<T = any>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(GRAPHQL, {
    method: "POST",
    headers: { Authorization: env.linear.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as any;
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

/** PM + Support lane. Registers only when LINEAR_API_KEY is set. */
export function linearTools(): OpsTool[] {
  if (!env.linear.apiKey) return [];

  return [
    {
      name: "linear_list_issues",
      gated: false,
      def: tool(
        "linear_list_issues",
        "List the most recently updated Linear issues (backlog snapshot).",
        { limit: z.number().int().min(1).max(50).default(10) },
        async ({ limit }) => {
          try {
            const data = await linear<{ issues: { nodes: any[] } }>(
              `query($n:Int!){ issues(first:$n, orderBy:updatedAt){ nodes{ identifier title state{name} url } } }`,
              { n: limit }
            );
            const nodes = data.issues.nodes;
            if (!nodes.length) return text("No issues found.");
            return text(nodes.map((i) => `${i.identifier} [${i.state?.name}] ${i.title} — ${i.url}`).join("\n"));
          } catch (e: any) {
            return fail(e.message);
          }
        }
      ),
    },
    {
      name: "linear_create_issue",
      gated: true,
      def: tool(
        "linear_create_issue",
        "Create a Linear issue in the first team. Use for filing bugs or backlog items.",
        { title: z.string(), description: z.string().optional() },
        async ({ title, description }) => {
          try {
            const teams = await linear<{ teams: { nodes: { id: string }[] } }>(
              `query{ teams(first:1){ nodes{ id } } }`
            );
            const teamId = teams.teams.nodes[0]?.id;
            if (!teamId) return fail("No Linear team found for this API key.");
            const data = await linear<{ issueCreate: { issue: { identifier: string; url: string } } }>(
              `mutation($t:String!,$ti:String!,$d:String){ issueCreate(input:{teamId:$t,title:$ti,description:$d}){ issue{ identifier url } } }`,
              { t: teamId, ti: title, d: description }
            );
            const issue = data.issueCreate.issue;
            return text(`Created ${issue.identifier}: ${issue.url}`);
          } catch (e: any) {
            return fail(e.message);
          }
        }
      ),
    },
  ];
}
