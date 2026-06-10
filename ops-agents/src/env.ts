import "dotenv/config";

/** Read an env var, throwing a clear error if a required one is missing. */
function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`✖ Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

export const env = {
  anthropicApiKey: required("ANTHROPIC_API_KEY"),
  slackBotToken: required("SLACK_BOT_TOKEN"),
  slackAppToken: required("SLACK_APP_TOKEN"),

  approvalsChannel: process.env.SLACK_APPROVALS_CHANNEL || "",

  channels: {
    support: process.env.SLACK_SUPPORT_CHANNEL || "",
    pm: process.env.SLACK_PM_CHANNEL || "",
    dev: process.env.SLACK_DEV_CHANNEL || "",
    marketing: process.env.SLACK_MARKETING_CHANNEL || "",
  },

  github: {
    token: process.env.GITHUB_TOKEN || "",
    repo: process.env.GITHUB_REPO || "",
  },
  sentry: {
    token: process.env.SENTRY_AUTH_TOKEN || "",
    org: process.env.SENTRY_ORG || "",
    project: process.env.SENTRY_PROJECT || "",
  },
  linear: { apiKey: process.env.LINEAR_API_KEY || "" },
  notion: { apiKey: process.env.NOTION_API_KEY || "" },
  product: {
    url: process.env.PRODUCT_API_URL || "",
    token: process.env.PRODUCT_API_TOKEN || "",
  },
};

/** Models — full IDs (the short aliases "opus"/"sonnet" also work). */
export const MODELS = {
  opus: "claude-opus-4-8",
  sonnet: "claude-sonnet-4-6",
} as const;
