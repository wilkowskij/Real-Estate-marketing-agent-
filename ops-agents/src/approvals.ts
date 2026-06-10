import { randomUUID } from "node:crypto";
import type { WebClient } from "@slack/web-api";

type Pending = { resolve: (approved: boolean) => void; timeout: NodeJS.Timeout };
const pending = new Map<string, Pending>();

const TIMEOUT_MS = 5 * 60 * 1000; // auto-deny after 5 minutes

/**
 * Post an Approve/Reject prompt and block until a human clicks (or it times out
 * → denied). Used by the agent's canUseTool hook for sensitive tools.
 */
export async function requestApproval(args: {
  client: WebClient;
  channel: string;
  thread_ts?: string;
  laneLabel: string;
  toolName: string;
  input: unknown;
  requestedBy?: string;
}): Promise<boolean> {
  const id = randomUUID();
  const shortTool = args.toolName.replace(/^mcp__ops__/, "");
  const inputStr = JSON.stringify(args.input, null, 2).slice(0, 2500);

  await args.client.chat.postMessage({
    channel: args.channel,
    thread_ts: args.thread_ts,
    text: `Approval needed: *${args.laneLabel}* wants to run \`${shortTool}\``,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Approval needed* — ${args.laneLabel} agent wants to run \`${shortTool}\`${
            args.requestedBy ? ` (requested by <@${args.requestedBy}>)` : ""
          }\n\`\`\`${inputStr}\`\`\``,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            style: "primary",
            text: { type: "plain_text", text: "Approve" },
            action_id: "ops_approve",
            value: id,
          },
          {
            type: "button",
            style: "danger",
            text: { type: "plain_text", text: "Reject" },
            action_id: "ops_reject",
            value: id,
          },
        ],
      },
    ],
  });

  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      resolve(false);
    }, TIMEOUT_MS);
    pending.set(id, { resolve, timeout });
  });
}

/** Resolve a pending approval from a button click. Returns false if unknown/expired. */
export function resolveApproval(id: string, approved: boolean): boolean {
  const p = pending.get(id);
  if (!p) return false;
  clearTimeout(p.timeout);
  pending.delete(id);
  p.resolve(approved);
  return true;
}
