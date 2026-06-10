import { getAnthropic, FAST_MODEL, cachedSystem, extractText } from "@/lib/anthropic/client";

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
and tasteful, non-cringe takes on broad trends. You never fabricate facts and
you respect Fair Housing. The agent's market area is provided with each request.

PRIORITIZE these proven-viral angles (rank relevance higher when a topic fits one):
- Tier 1 (highest reach): bidding-war / over-asking stories; interest-rate
  impact explainers; migration/relocation stories into the local market.
- Tier 2: hyperlocal neighborhood spotlights; school-district breakdowns;
  "deal of the week"; before/after renovations.
- Tier 3: client testimonials; price drops WITH commentary; luxury reveals.
The best-performing format is a short Reel with a surprising local fact, a
direct/slightly-frustrated tone, ending on a question that invites comments.`;

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

  const text = extractText(msg.content);
  const match = text.match(/\{[\s\S]*\}/);
  let raw: any = {};
  if (match) {
    try {
      raw = JSON.parse(match[0]);
    } catch {
      raw = {}; // malformed → treat as not worth posting rather than crash the cron
    }
  }
  return {
    worthPosting: Boolean(raw.worthPosting),
    relevance: Number(raw.relevance) || 0,
    angle: raw.angle ? String(raw.angle) : null,
    reason: String(raw.reason ?? ""),
  };
}
