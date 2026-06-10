import { query } from "@anthropic-ai/claude-agent-sdk";
import type { Profile } from "./profiles";
import type { Toolset } from "./tools";

/**
 * Run one agent turn and return the final text. The agent is sandboxed to its
 * own tools: `allowedTools` is the allowlist, and canUseTool denies anything
 * outside it (so no filesystem/bash/web access) and routes gated tools through
 * a human approval callback.
 */
export async function runAgent(args: {
  profile: Profile;
  prompt: string;
  toolset: Toolset;
  /** Resolve true to allow a gated tool, false to reject. */
  canApprove: (toolName: string, input: Record<string, unknown>) => Promise<boolean>;
}): Promise<string> {
  const { profile, prompt, toolset, canApprove } = args;
  const allowed = new Set(toolset.allowedTools);

  const options: Record<string, unknown> = {
    model: profile.model,
    systemPrompt: profile.system,
    allowedTools: toolset.allowedTools,
    permissionMode: "default",
    maxTurns: 16,
    canUseTool: async (toolName: string, input: Record<string, unknown>) => {
      if (!allowed.has(toolName)) {
        return { behavior: "deny", message: `Tool ${toolName} is not permitted for this agent.` };
      }
      if (toolset.gatedTools.has(toolName)) {
        const ok = await canApprove(toolName, input);
        return ok
          ? { behavior: "allow", updatedInput: input }
          : { behavior: "deny", message: "A human rejected this action." };
      }
      return { behavior: "allow", updatedInput: input };
    },
  };
  if (Object.keys(toolset.mcpServers).length > 0) {
    options.mcpServers = toolset.mcpServers;
  }

  const assistantTexts: string[] = [];
  let resultText = "";

  for await (const message of query({ prompt, options: options as any })) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "text" && block.text.trim()) assistantTexts.push(block.text);
      }
    } else if (message.type === "result") {
      if ("result" in message && typeof message.result === "string") resultText = message.result;
    }
  }

  return resultText || assistantTexts.join("\n\n") || "_(no response)_";
}
