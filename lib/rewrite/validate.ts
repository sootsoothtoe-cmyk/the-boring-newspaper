/**
 * Very conservative hallucination check: disallow new digits and new latin words;
 * and require that Myanmar text tokens in the rewrite are mostly present in original.
 * This is intentionally strict for MVP safety.
 */
export function validateNoNewEntities(original: string, rewrite: string): boolean {
  const o = (original || "").toLowerCase();
  const r = (rewrite || "").toLowerCase();

  // If rewrite introduces digits not in original, likely adds dates/numbers.
  const oDigits = new Set((o.match(/\d+/g) || []).join(" ").split(""));
  const rDigits = new Set((r.match(/\d+/g) || []).join(" ").split(""));
  for (const d of rDigits) {
    if (d && !oDigits.has(d)) return false;
  }

  // New Latin words (names) not in original.
  const oLatin = new Set((o.match(/[a-z]{2,}/g) || []));
  for (const w of (r.match(/[a-z]{2,}/g) || [])) {
    if (!oLatin.has(w)) return false;
  }

  // Token overlap heuristic for Myanmar script (split by spaces)
  const oTokens = new Set(o.split(/\s+/).filter(Boolean));
  const rTokens = r.split(/\s+/).filter(Boolean);
  if (rTokens.length === 0) return true;

  let missing = 0;
  for (const t of rTokens) {
    // ignore very short tokens
    if (t.length <= 1) continue;
    if (!oTokens.has(t)) missing += 1;
  }
  // allow a small amount of paraphrase; be strict.
  return missing <= Math.max(2, Math.floor(rTokens.length * 0.25));
}
