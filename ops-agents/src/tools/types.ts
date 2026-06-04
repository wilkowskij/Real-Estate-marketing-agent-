/**
 * One tool the agents can call. `gated` tools require a human Approve click in
 * Slack before they execute (see runAgent.ts canUseTool).
 */
export type OpsTool = {
  /** Short name; the agent sees it namespaced as `mcp__ops__<name>`. */
  name: string;
  /** Sensitive/side-effecting → require human approval before running. */
  gated: boolean;
  /** The SDK tool definition from `tool(...)`. Loosely typed: each call returns
   *  a distinct generic that isn't mutually assignable, so we keep it open. */
  def: unknown;
};

/** Convenience: a successful text result for a tool handler. */
export function text(s: string) {
  return { content: [{ type: "text" as const, text: s }] };
}

/** Convenience: an error result a tool handler can return. */
export function fail(s: string) {
  return { content: [{ type: "text" as const, text: s }], isError: true };
}
