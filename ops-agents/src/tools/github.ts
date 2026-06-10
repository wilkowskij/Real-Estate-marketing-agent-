import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { env } from "../env";
import { fail, text, type OpsTool } from "./types";

const API = "https://api.github.com";

async function gh(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.github.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Dev-lane tools. Registers only when GITHUB_TOKEN + GITHUB_REPO are set. */
export function githubTools(): OpsTool[] {
  if (!env.github.token || !env.github.repo) return [];
  const repo = env.github.repo;

  return [
    {
      name: "github_list_issues",
      gated: false, // read-only
      def: tool(
        "github_list_issues",
        `List recent open issues in ${repo}.`,
        { limit: z.number().int().min(1).max(50).default(10).describe("How many issues to return") },
        async ({ limit }) => {
          try {
            const issues = (await gh(`/repos/${repo}/issues?state=open&per_page=${limit}`)) as any[];
            if (!issues.length) return text("No open issues.");
            return text(
              issues
                .filter((i) => !i.pull_request)
                .map((i) => `#${i.number} ${i.title} — ${i.html_url}`)
                .join("\n")
            );
          } catch (e: any) {
            return fail(e.message);
          }
        }
      ),
    },
    {
      name: "github_create_issue",
      gated: true, // side-effecting → human approval
      def: tool(
        "github_create_issue",
        `Open a new issue in ${repo} (bug report or feature request).`,
        {
          title: z.string().describe("Concise issue title"),
          body: z.string().optional().describe("Markdown body: repro steps, context, acceptance criteria"),
          labels: z.array(z.string()).optional().describe("Label names, e.g. ['bug']"),
        },
        async ({ title, body, labels }) => {
          try {
            const issue = (await gh(`/repos/${repo}/issues`, {
              method: "POST",
              body: JSON.stringify({ title, body, labels }),
            })) as any;
            return text(`Created #${issue.number}: ${issue.html_url}`);
          } catch (e: any) {
            return fail(e.message);
          }
        }
      ),
    },
  ];
}
