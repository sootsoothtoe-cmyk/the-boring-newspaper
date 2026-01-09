import type { RewriteResult } from "@/lib/types";

/**
 * Pluggable LLM rewrite module.
 * MVP: stubbed to keep the code path and safety gate in place.
 * You can replace this with OpenAI / other API calls later.
 */
export async function llmRewrite(originalTitle: string): Promise<RewriteResult> {
  // This stub intentionally does NOT call any external service.
  // To implement later: call your provider using process.env.LLM_API_KEY
  // and return neutral Burmese headline + flags.
  return {
    neutralTitle: originalTitle,
    rewriteFlags: ["llm_stub"],
    rewriteMode: "llm",
  };
}
