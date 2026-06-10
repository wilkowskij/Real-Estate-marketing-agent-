import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { env } from "../env";
import { fail, text, type OpsTool } from "./types";

/**
 * Marketing lane — drive YOUR OWN product to draft a campaign (dogfooding).
 * Registers only when PRODUCT_API_URL + PRODUCT_API_TOKEN are set.
 *
 * NOTE: the product's /api/campaigns/generate currently authenticates via the
 * user session. To call it from this bot you'd add a service-token path to that
 * route that checks `Authorization: Bearer <PRODUCT_API_TOKEN>` and resolves a
 * fixed org. Until then, leave PRODUCT_API_TOKEN unset and the Marketing agent
 * just writes copy directly (no tool needed).
 */
export function productTools(): OpsTool[] {
  if (!env.product.url || !env.product.token) return [];

  return [
    {
      name: "product_generate_campaign",
      gated: true, // spends AI credits in the product
      def: tool(
        "product_generate_campaign",
        "Generate a real marketing campaign (copy + graphic) in the product.",
        {
          type: z
            .enum([
              "just_sold",
              "new_listing",
              "open_house",
              "market_stat",
              "neighborhood_spotlight",
              "educational",
              "custom",
            ])
            .describe("Campaign type"),
          instructions: z.string().optional(),
          town: z.string().optional(),
        },
        async ({ type, instructions, town }) => {
          try {
            const res = await fetch(`${env.product.url}/api/campaigns/generate`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${env.product.token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ type, instructions, generateImage: true, listing: town ? { town } : undefined }),
            });
            if (!res.ok) return fail(`Product API ${res.status}: ${await res.text()}`);
            const json = (await res.json()) as any;
            const c = json.copy ?? {};
            return text(
              `Drafted ${type}:\nHeadline: ${c.headline}\n\n${c.caption}\n\nCTA: ${c.cta}\nPreview: ${json.previewUrl ?? "(none)"}`
            );
          } catch (e: any) {
            return fail(e.message);
          }
        }
      ),
    },
  ];
}
