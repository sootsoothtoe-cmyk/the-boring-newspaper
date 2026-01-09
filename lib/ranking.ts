import type { Headline } from "@prisma/client";

export type SortMode = "newest" | "balanced";

function timeScore(h: Headline): number {
  const t = (h.publishedAt ?? h.fetchedAt).getTime();
  const ageMin = (Date.now() - t) / (60 * 1000);
  // fresh -> higher. half-life ~ 6 hours
  return Math.exp(-ageMin / 360);
}

export function rankHeadlines(
  headlines: Headline[],
  mode: SortMode,
  broaden: boolean
): Headline[] {
  // Base score = recency, then apply diversity constraints with greedy selection.
  const scored = headlines.map((h) => ({
    h,
    score: timeScore(h) + (broaden ? 0.05 : 0),
  }));

  scored.sort((a, b) => b.score - a.score);
  if (mode === "newest") {
    return scored.map((x) => x.h);
  }

  // Balanced + anti-echo: greedy pick with penalties for repeating source/category.
  const result: Headline[] = [];
  const max = headlines.length;

  const sourceCount: Record<string, number> = {};
  const catCount: Record<string, number> = {};

  function penalty(h: Headline, idx: number): number {
    let p = 0;

    const prev1 = result[idx - 1];
    const prev2 = result[idx - 2];

    if (prev1 && prev1.sourceName === h.sourceName) p += 1.5;
    if (prev2 && prev2.sourceName === h.sourceName) p += 2.5;

    if (prev1 && prev1.category === h.category) p += 1.0;
    if (prev2 && prev2.category === h.category) p += 2.0;

    // Broaden: also penalize overall concentration.
    if (broaden) {
      p += (sourceCount[h.sourceName] || 0) * 0.08;
      p += (catCount[h.category] || 0) * 0.06;
    }
    return p;
  }

  const pool = [...scored];

  while (result.length < max && pool.length) {
    let bestIdx = 0;
    let bestValue = -Infinity;

    for (let i = 0; i < Math.min(pool.length, 120); i++) {
      const cand = pool[i].h;
      const val = pool[i].score - penalty(cand, result.length);

      // Hard constraints: not more than 2 consecutive from same source/category.
      const prev1 = result[result.length - 1];
      const prev2 = result[result.length - 2];
      const badSource = prev1 && prev2 && prev1.sourceName === prev2.sourceName && cand.sourceName === prev1.sourceName;
      const badCat = prev1 && prev2 && prev1.category === prev2.category && cand.category === prev1.category;

      const hardPenalty = (badSource || badCat) ? 999 : 0;
      const v2 = val - hardPenalty;

      if (v2 > bestValue) {
        bestValue = v2;
        bestIdx = i;
      }
    }

    const picked = pool.splice(bestIdx, 1)[0].h;
    result.push(picked);
    sourceCount[picked.sourceName] = (sourceCount[picked.sourceName] || 0) + 1;
    catCount[picked.category] = (catCount[picked.category] || 0) + 1;
  }

  return result;
}
