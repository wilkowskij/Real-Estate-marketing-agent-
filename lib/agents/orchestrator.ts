import { getAnthropic, FAST_MODEL, cachedSystem } from "@/lib/anthropic/client";

/**
 * Content Strategist / Orchestrator Agent — owns WHEN & WHETHER to post.
 *
 * In the interactive flow the UI drives Marketing + Design directly. The
 * orchestrator's distinct job is the AUTONOMOUS work:
 *   - Decide which trending topic / local-news item is worth a post.
 *   - Score relevance to real estate in the org's area.
 *   - Always default to "needs review" unless the job opted into auto-publish.
 */
const ORCHESTRATOR_SYSTEM = `You decide whether a topic is worth a real estate
agent's social post. You protect the agent's brand: skip anything political,
tragic, controversial, or off-brand. You favor genuinely useful local angles
(market shifts, mortgage-rate moves, neighborhood happenings, seasonal tips)
and tasteful, non-cringe takes on broad trends. You never fabricate facts and
you respect Fair Housing.`;

export interface TopicJudgement {
  worthPosting: boolean;
  relevance: number; // 0-1
  angle: string | null; // suggested real-estate angle if worthPosting
  reason: string;
}

export async function judgeTopic(args: {
  topic: string;
  area: string;
  source?: string;
}): Promise<TopicJudgement> {
  const client = getAnthropic();
  const msg = await client.messages.create({
    model: FAST_MODEL,
    max_tokens: 400,
    system: cachedSystem(ORCHESTRATOR_SYSTEM),
    messages: [
      {
        role: "user",
        content: `Area: ${args.area}
Topic: ${args.topic}
Source: ${args.source ?? "n/a"}

Should a real estate agent in this area post about this? Return ONLY JSON:
{"worthPosting": boolean, "relevance": number, "angle": string|null, "reason": string}`,
      },
    ],
  });

  const text = msg.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("");
  const match = text.match(/\{[\s\S]*\}/);
  const raw = match ? JSON.parse(match[0]) : {};
  return {
    worthPosting: Boolean(raw.worthPosting),
    relevance: Number(raw.relevance) || 0,
    angle: raw.angle ? String(raw.angle) : null,
    reason: String(raw.reason ?? ""),
  };
}
