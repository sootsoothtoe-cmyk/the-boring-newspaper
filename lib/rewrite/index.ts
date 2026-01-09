import type { RewriteResult } from "@/lib/types";
import { rulesRewrite } from "@/lib/rewrite/rules";
import { llmRewrite } from "@/lib/rewrite/llm";
import { validateNoNewEntities } from "@/lib/rewrite/validate";

function ensureNonEmpty(result: RewriteResult, original: string): RewriteResult {
  const t = (result.neutralTitle || "").trim();
  if (t.length) return result;
  const fallback = rulesRewrite(original);
  return {
    ...fallback,
    rewriteFlags: Array.from(new Set([...(result.rewriteFlags || []), ...(fallback.rewriteFlags || []), "rewrite_empty_fallback"])),
    rewriteMode: "rules",
  };
}

export async function rewriteHeadline(originalTitle: string): Promise<RewriteResult> {
  const mode = (process.env.REWRITE_MODE || "rules").toLowerCase() as "rules" | "llm";

  if (mode === "llm" && process.env.LLM_API_KEY) {
    try {
      const llm = await llmRewrite(originalTitle);

      if (!validateNoNewEntities(originalTitle, llm.neutralTitle)) {
        const ruled = rulesRewrite(originalTitle);
        return ensureNonEmpty(
          { ...ruled, rewriteFlags: [...(llm.rewriteFlags || []), ...ruled.rewriteFlags, "possible_hallucination"], rewriteMode: "rules" },
          originalTitle
        );
      }

      return ensureNonEmpty(llm, originalTitle);
    } catch {
      return ensureNonEmpty(rulesRewrite(originalTitle), originalTitle);
    }
  }

  return ensureNonEmpty(rulesRewrite(originalTitle), originalTitle);
}
