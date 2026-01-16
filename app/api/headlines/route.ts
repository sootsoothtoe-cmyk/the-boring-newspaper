export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rankHeadlines } from "@/lib/ranking";
import { shuffleWindow } from "@/lib/shuffle";

const QuerySchema = z.object({
  limit: z.string().optional(),
  category: z.string().optional(),
  source: z.string().optional(),
  sort: z.string().optional(),
  broaden: z.string().optional(),
  shuffle: z.string().optional(),
  seed: z.string().optional(),
  window: z.string().optional(),
});


function baseDeterministicSort<T extends { publishedAt: Date | null; fetchedAt: Date }>(items: T[]): T[] {
  // publishedAt DESC NULLS LAST, then fetchedAt DESC
  const withPub = items.filter((x) => x.publishedAt);
  const withoutPub = items.filter((x) => !x.publishedAt);

  withPub.sort((a, b) => (b.publishedAt!.getTime() - a.publishedAt!.getTime()) || (b.fetchedAt.getTime() - a.fetchedAt.getTime()));
  withoutPub.sort((a, b) => b.fetchedAt.getTime() - a.fetchedAt.getTime());

  return withPub.concat(withoutPub);
}

function parseBool(v: string | null): boolean {
  return v === "1" || v === "true" || v === "yes";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = QuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
  const limit = Math.min(Number(q.limit || 50), 200);
  const broaden = (q.broaden || "0") === "1" || (q.broaden || "").toLowerCase() === "true";
  const sort = (q.sort || "balanced").toLowerCase() === "newest" ? "newest" : "balanced";
  const shuffle = parseBool(q.shuffle ?? "0");

// seed: must be a stable integer; if missing/bad, fall back
  const seed = Number.parseInt(q.seed || "", 10);
  const safeSeed = Number.isFinite(seed) ? seed : Date.now();

// window: bound it so it stays calm + safe
  const windowSizeRaw = Number.parseInt(q.window || "80", 10);
  const windowSize = Math.max(10, Math.min(windowSizeRaw, 200));

  const where: any = { isActive: true, language: "my" };
  if (q.category && q.category !== "ALL") where.category = q.category;
  if (q.source && q.source !== "ALL") where.sourceName = q.source;

  const headlines = await prisma.headline.findMany({
  where,
  orderBy: [{ fetchedAt: "desc" }], // fine as a first pass
  take: 1000,
});

// enforce publishedAt DESC NULLS LAST then fetchedAt DESC deterministically
  const base = baseDeterministicSort(headlines);

// rank (balanced vs newest)
let ranked = rankHeadlines(base, sort, broaden).slice(0, limit);
console.log("before shuffle", ranked.slice(0, 6).map(h => h.id));
// shuffle applies only in balanced mode
if (sort === "balanced" && shuffle) {
  ranked = shuffleWindow(ranked, windowSize, String(safeSeed));
}
console.log("after shuffle", ranked.slice(0, 6).map(h => h.id));
  // Also reported by... (cluster mates)
  const clusterIds = Array.from(new Set(ranked.map((h) => h.clusterId).filter(Boolean))) as string[];
  const clusterMates = await prisma.headline.findMany({
    where: { clusterId: { in: clusterIds }, isActive: true },
    select: { clusterId: true, sourceName: true, articleUrl: true },
  });

console.log("shuffle debug", {
  shuffle,
  seedRaw: q.seed,
  safeSeed,
  windowSize,
  sort,
});

  const byCluster: Record<string, { sourceName: string; articleUrl: string }[]> = {};
  for (const m of clusterMates) {
    if (!m.clusterId) continue;
    byCluster[m.clusterId] = byCluster[m.clusterId] || [];
    byCluster[m.clusterId].push({ sourceName: m.sourceName, articleUrl: m.articleUrl });
  }


  const payload = ranked.map((h) => {
  const neutral = (h.neutralTitle || "").trim();
  const usedOriginalFallback = neutral.length === 0;
  const displayTitle = usedOriginalFallback ? h.originalTitle : neutral;

  return {
    id: h.id,
    sourceName: h.sourceName,
    sourceUrl: h.sourceUrl,
    articleUrl: h.articleUrl,
    originalTitle: h.originalTitle,
    neutralTitle: neutral || null,
    displayTitle,
    usedOriginalFallback,
    publishedAt: h.publishedAt,
    fetchedAt: h.fetchedAt,
    category: h.category,
    rewriteMode: h.rewriteMode,
    rewriteFlags: h.rewriteFlags,
    clusterId: h.clusterId,
    alsoReportedBy: h.clusterId
      ? (byCluster[h.clusterId] || []).filter((x) => x.articleUrl !== h.articleUrl)
      : [],
  };
});


  return NextResponse.json(
  { items: payload },
  {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  }
);
}
