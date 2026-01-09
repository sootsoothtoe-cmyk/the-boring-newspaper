/**
 * Burmese text normalization for dedupe & rules.
 * MVP: normalize whitespace/punctuation and remove common filler particles.
 */
const MY_FILLERS = [
  "သည်", "က", "ကို", "မှာ", "နှင့်", "နဲ့", "၏", "အပေါ်", "အတွက်", "ပြော", "ဆို", "ဟု", "ကြောင်း",
  "ဖြစ်", "များ", "တစ်", "အဖြစ်", "နောက်", "အပြီး", "ရ",
];

export function normalizeMyanmarText(input: string): string {
  let t = input || "";
  t = t.replace(/[“”„‟"]/g, ""); // quotes
  t = t.replace(/[၊။·•…]/g, " "); // punctuation to spaces
  t = t.replace(/[()（）\[\]{}<>]/g, " ");
  t = t.replace(/\s+/g, " ").trim();

  // remove zero-width chars
  t = t.replace(/[\u200B-\u200D\uFEFF]/g, "");

  // remove some fillers (word boundary-ish by spaces)
  const parts = t.split(" ").filter(Boolean);
  const filtered = parts.filter((w) => !MY_FILLERS.includes(w));
  return filtered.join(" ").trim();
}

export function containsMyanmarScript(s: string): boolean {
  // Myanmar block: U+1000–U+109F + extended blocks commonly used
  return /[\u1000-\u109F\uA9E0-\uA9FF]/.test(s);
}
