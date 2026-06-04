import { createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { githubTools } from "./github";
import { linearTools } from "./linear";
import { notionTools } from "./notion";
import { sentryTools } from "./sentry";
import { productTools } from "./product";
import type { OpsTool } from "./types";

/** Capability keys a profile can request. */
export type Capability = "github" | "sentry" | "linear" | "notion" | "product";

const FACTORIES: Record<Capability, () => OpsTool[]> = {
  github: githubTools,
  sentry: sentryTools,
  linear: linearTools,
  notion: notionTools,
  product: productTools,
};

/** All tools are exposed under this MCP server alias → `mcp__ops__<name>`. */
const SERVER_ALIAS = "ops";
const fullName = (name: string) => `mcp__${SERVER_ALIAS}__${name}`;

export type Toolset = {
  mcpServers: Record<string, ReturnType<typeof createSdkMcpServer>>;
  /** Full tool names this agent may call (the allowlist). */
  allowedTools: string[];
  /** Full tool names that require a human Approve click. */
  gatedTools: Set<string>;
};

/**
 * Build the MCP server + allow/gate lists for a profile's requested
 * capabilities. Capabilities whose env isn't configured contribute no tools, so
 * an agent simply runs with fewer (or zero) tools — never an error.
 */
export function buildToolset(capabilities: Capability[]): Toolset {
  const tools: OpsTool[] = capabilities.flatMap((c) => FACTORIES[c]());

  if (tools.length === 0) {
    return { mcpServers: {}, allowedTools: [], gatedTools: new Set() };
  }

  const server = createSdkMcpServer({
    name: SERVER_ALIAS,
    version: "1.0.0",
    tools: tools.map((t) => t.def) as any,
  });

  return {
    mcpServers: { [SERVER_ALIAS]: server },
    allowedTools: tools.map((t) => fullName(t.name)),
    gatedTools: new Set(tools.filter((t) => t.gated).map((t) => fullName(t.name))),
  };
}
