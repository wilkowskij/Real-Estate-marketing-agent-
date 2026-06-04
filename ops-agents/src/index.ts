import { App } from "@slack/bolt";
import { env } from "./env";
import { PROFILES, type Lane } from "./profiles";
import { buildToolset, type Toolset } from "./tools";
import { runAgent } from "./runAgent";
import { requestApproval, resolveApproval } from "./approvals";

// ── Channel → lane routing (from env) ───────────────────────────────────────
const CHANNEL_TO_LANE: Record<string, Lane> = {};
for (const [lane, id] of Object.entries(env.channels)) {
  if (id) CHANNEL_TO_LANE[id] = lane as Lane;
}

// Precompute each lane's toolset once at startup (logs what's enabled).
const TOOLSETS: Record<Lane, Toolset> = {} as any;
for (const lane of Object.keys(PROFILES) as Lane[]) {
  TOOLSETS[lane] = buildToolset(PROFILES[lane].capabilities);
}

const app = new App({
  token: env.slackBotToken,
  appToken: env.slackAppToken,
  socketMode: true,
});

let botUserId = "";

// Simple in-memory dedupe so Slack retries don't double-process an event.
const seen = new Set<string>();
function firstSeen(key: string): boolean {
  if (seen.has(key)) return false;
  seen.add(key);
  if (seen.size > 1000) seen.delete(seen.values().next().value as string);
  return true;
}

const stripMentions = (s: string) => s.replace(/<@[A-Z0-9]+>/g, "").trim();

// ── Respond when the bot is @-mentioned in a routed channel ──────────────────
app.event("app_mention", async ({ event, client }) => {
  const e = event as any;

  // Loop guard: never react to bots (including ourselves / sibling agents).
  if (e.bot_id || e.user === botUserId) return;

  const lane = CHANNEL_TO_LANE[e.channel];
  if (!lane) return; // channel isn't mapped to an agent
  if (!firstSeen(e.ts)) return;

  const profile = PROFILES[lane];
  const toolset = TOOLSETS[lane];
  const thread_ts = e.thread_ts || e.ts;

  await client.reactions
    .add({ channel: e.channel, timestamp: e.ts, name: "eyes" })
    .catch(() => {});

  try {
    // Thread context: only the last ~20 replies, not the whole channel.
    const history = await client.conversations
      .replies({ channel: e.channel, ts: thread_ts, limit: 20 })
      .catch(() => null);

    const transcript = (history?.messages ?? [])
      .map((m: any) => {
        const who = m.user === botUserId || m.bot_id ? "assistant" : `user:${m.user}`;
        return `${who}: ${stripMentions(m.text ?? "")}`;
      })
      .join("\n");

    const prompt =
      `You are the ${profile.label} agent in Slack. Recent thread:\n` +
      `${transcript || stripMentions(e.text)}\n\n` +
      `Respond to the latest user message.`;

    const reply = await runAgent({
      profile,
      prompt,
      toolset,
      canApprove: (toolName, input) =>
        requestApproval({
          client,
          channel: env.approvalsChannel || e.channel,
          thread_ts: env.approvalsChannel ? undefined : thread_ts,
          laneLabel: profile.label,
          toolName,
          input,
          requestedBy: e.user,
        }),
    });

    await client.chat.postMessage({ channel: e.channel, thread_ts, text: reply });
  } catch (err: any) {
    console.error(`[${lane}]`, err);
    await client.chat.postMessage({
      channel: e.channel,
      thread_ts,
      text: `:warning: The ${profile.label} agent hit an error: ${err?.message ?? err}`,
    });
  } finally {
    await client.reactions
      .remove({ channel: e.channel, timestamp: e.ts, name: "eyes" })
      .catch(() => {});
  }
});

// ── Approve / Reject buttons ─────────────────────────────────────────────────
async function handleDecision(approved: boolean, body: any, client: any) {
  const id = body.actions?.[0]?.value as string;
  const ok = resolveApproval(id, approved);
  const verb = approved ? "Approved" : "Rejected";
  const note = ok ? `${verb} by <@${body.user.id}>` : `Already handled or expired.`;
  await client.chat
    .update({
      channel: body.channel.id,
      ts: body.message.ts,
      text: note,
      blocks: [{ type: "section", text: { type: "mrkdwn", text: `:lock: ${note}` } }],
    })
    .catch(() => {});
}

app.action("ops_approve", async ({ ack, body, client }) => {
  await ack();
  await handleDecision(true, body, client);
});
app.action("ops_reject", async ({ ack, body, client }) => {
  await ack();
  await handleDecision(false, body, client);
});

// ── Boot ─────────────────────────────────────────────────────────────────────
(async () => {
  await app.start();
  const auth = await app.client.auth.test({ token: env.slackBotToken });
  botUserId = (auth.user_id as string) ?? "";

  console.log("⚡ ops-agents running (Socket Mode)");
  for (const lane of Object.keys(PROFILES) as Lane[]) {
    const id = env.channels[lane];
    const tools = TOOLSETS[lane].allowedTools.map((t) => t.replace(/^mcp__ops__/, ""));
    console.log(
      `  • ${PROFILES[lane].label.padEnd(18)} ${id ? `→ ${id}` : "(no channel set — disabled)"}` +
        `  tools: ${tools.length ? tools.join(", ") : "none (chat only)"}`
    );
  }
})();
