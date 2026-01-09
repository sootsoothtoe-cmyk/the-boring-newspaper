import type { RewriteResult } from "@/lib/types";

const CLICKBAIT_TERMS = [
  // Common Burmese clickbait/sensational language (extend as needed)

  "အရေးပေါ်",
  "အံ့အားသင့်ဖွယ်",
  "ထိတ်လန့်ဖွယ်",
  "ကြီးမားတဲ့",
  "မယုံနိုင်စရာ",
  "အထူး",
  "အလွန်",
  "တုန်လှုပ်",
  "မကြာခင်",
  "ရုတ်တရက်",
  "ဒေါသထွက်",
  "တုန့်ပြန်",
  "ဟုန်းဟုန်း",
  "ပြင်းပြင်းထန်ထန်",
  "ကြောက်စရာ",
  "အလွန်ကြောက်မက်ဖွယ်",
  "ထူးခြား",
];

const VAGUE_PATTERNS: RegExp[] = [
  /ဘာဖြစ်ခဲ့သလဲ/i,
  /သိရ/i,
  /အကြောင်းရင်း/i,
  /အရေးကြီး/i,
  /နောက်ဆုံး/i,
  /မည်သို့/i,
];

function stripClickbait(s: string) {
  let t = s;
  for (const term of CLICKBAIT_TERMS) {
    t = t.replaceAll(term, "");
  }
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

function addAttributionIfObvious(original: string, cleaned: string): string {
  // MVP: If original mentions an org/person with "အဆိုအရ/ပြောကြား/ဆို", keep it. Otherwise no invention.
  // We can still add generic "သတင်းအရ" only if original hints at reporting ("အဆိုအရ", "ပြောကြား", "ဆို").
  const hasAttributionCue = /(အဆိုအရ|ပြောကြား|ဆိုကြ|ဆိုသည်|ကြေညာ|သတင်းအရ)/.test(original);
  if (!hasAttributionCue) return cleaned;

  // Prefer explicitly: "သတင်းအရ ..." if there isn't already a leading attribution.
  const alreadyStarts = /^(.{1,20})(အဆိုအရ|သတင်းအရ)/.test(cleaned);
  if (alreadyStarts) return cleaned;
  return `သတင်းအရ ${cleaned}`;
}

function softenPunctuation(s: string) {
  return s.replace(/[!！]+/g, "").replace(/[?？]+/g, "").replace(/\s+/g, " ").trim();
}

function ensureNonEmpty(original: string, candidate: string): string {
  const c = (candidate || "").trim();
  if (c.length) return c;

  // Fallback: minimal neutralization without inventing facts
  let t = (original || "").trim();
  t = stripClickbait(t);
  t = softenPunctuation(t);
  t = t.replace(/\s+/g, " ").trim();
  if (t.length) return t;

  return (original || "").trim();
}

export function rulesRewrite(originalTitle: string): RewriteResult {
  const flags: string[] = [];
  let t = (originalTitle || "").trim();

  if (t.length === 0) {
    return { neutralTitle: "", rewriteFlags: ["empty"], rewriteMode: "rules" };
  }

  const before = t;
  t = stripClickbait(t);

  // Soften sensational punctuation
  t = softenPunctuation(t);

  // If too vague, keep cautious framing
  const isVague = VAGUE_PATTERNS.some((r) => r.test(before)) || t.length < 10;
  if (isVague) {
    flags.push("vague");
    // Keep original but cleaned; avoid sounding certain.
    t = t.replace(/\s+/g, " ").trim();
  }

  t = addAttributionIfObvious(before, t);

  // Enforce ~90 Burmese chars by hard trim (MVP)
  if (t.length > 90) {
    t = t.slice(0, 88).trim() + "…";
    flags.push("trimmed");
  }

  // If stripping removed too much, fallback to original
  if (t.replace(/[\s…]/g, "").length < Math.max(5, before.replace(/\s/g, "").length * 0.3)) {
    t = before.length > 90 ? before.slice(0, 88).trim() + "…" : before;
    flags.push("rewrite_low_confidence");
  }

  t = ensureNonEmpty(before, t);

  return { neutralTitle: t, rewriteFlags: flags, rewriteMode: "rules" };
}
