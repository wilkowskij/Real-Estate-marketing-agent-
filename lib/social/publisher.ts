/**
 * Publishing layer. Every platform implements the same SocialPublisher
 * interface, and the publish queue routes posts to the right one.
 *
 * IMPORTANT: live posting to Instagram/Facebook (Meta Graph API) and LinkedIn
 * requires app review + business verification, which can take weeks. Until a
 * platform is approved we register the ManualExportPublisher, which produces a
 * downloadable bundle (image + caption) instead of calling the API. The queue
 * and the rest of the app are identical either way — flipping a platform live
 * is just swapping the registered implementation.
 */

export interface PublishInput {
  caption: string;
  /** Public/signed URLs of media to attach. */
  mediaUrls: string[];
}

export interface PublishResult {
  ok: boolean;
  platformPostId?: string;
  /** For manual export: a link/bundle the agent posts themselves. */
  exportUrl?: string;
  error?: string;
}

export interface SocialPublisher {
  readonly platform: string;
  /** Whether this is a live API publisher (true) or manual export (false). */
  readonly live: boolean;
  publish(input: PublishInput, auth: PlatformAuth): Promise<PublishResult>;
}

export interface PlatformAuth {
  accessToken?: string;
  meta?: Record<string, unknown>;
}

/** Fallback used until Meta/LinkedIn approvals land. Never fails. */
class ManualExportPublisher implements SocialPublisher {
  constructor(public readonly platform: string) {}
  readonly live = false;
  async publish(input: PublishInput): Promise<PublishResult> {
    // The caller persists the post as "approved/scheduled"; the UI surfaces the
    // image + caption for the agent to download and post by hand.
    return { ok: true, exportUrl: input.mediaUrls[0] };
  }
}

const registry: Record<string, SocialPublisher> = {
  instagram: new ManualExportPublisher("instagram"),
  facebook: new ManualExportPublisher("facebook"),
  linkedin: new ManualExportPublisher("linkedin"),
  x: new ManualExportPublisher("x"),
};

export function getPublisher(platform: string): SocialPublisher {
  const p = registry[platform];
  if (!p) throw new Error(`No publisher registered for platform: ${platform}`);
  return p;
}

/** Swap in a live publisher once a platform's API access is approved. */
export function registerPublisher(publisher: SocialPublisher) {
  registry[publisher.platform] = publisher;
}

/**
 * Promote a platform to its live publisher only when the platform's OAuth app
 * is configured (env credentials present). Until App Review approval lands and
 * credentials are set, the ManualExportPublisher stays registered — the queue
 * and callers don't change. This runs lazily on first use of getActivePublisher.
 */
let promoted = false;
function promoteLivePublishers() {
  if (promoted) return;
  promoted = true;
  // Imported lazily to avoid pulling platform SDK code on cold paths.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { isConfigured } = require("./oauth") as typeof import("./oauth");
  if (isConfigured("instagram")) {
    const { InstagramPublisher } = require("./publishers/meta") as typeof import("./publishers/meta");
    registry.instagram = new InstagramPublisher();
  }
  if (isConfigured("facebook")) {
    const { FacebookPublisher } = require("./publishers/meta") as typeof import("./publishers/meta");
    registry.facebook = new FacebookPublisher();
  }
  if (isConfigured("linkedin")) {
    const { LinkedInPublisher } = require("./publishers/linkedin") as typeof import("./publishers/linkedin");
    registry.linkedin = new LinkedInPublisher();
  }
}

/** Get the publisher for a platform, promoting to live if configured. */
export function getActivePublisher(platform: string): SocialPublisher {
  promoteLivePublishers();
  return getPublisher(platform);
}
