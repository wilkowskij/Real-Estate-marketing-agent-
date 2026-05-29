import { ImageResponse } from "@vercel/og";
import { CampaignCard } from "./templates/CampaignCard";
import type { TemplateProps } from "./templates/types";

/**
 * Render a campaign graphic to a PNG buffer using @vercel/og (Satori + resvg).
 * Deterministic and fast; no headless browser needed.
 */
export async function renderCampaignPng(
  props: TemplateProps
): Promise<ArrayBuffer> {
  const res = new ImageResponse(<CampaignCard {...props} />, {
    width: props.width,
    height: props.height,
  });
  return res.arrayBuffer();
}
