import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rankHeadlines } from "@/lib/ranking";

const QuerySchema = z.object({
  limit: z.string().optional(),
  category: z.string().optional(),
  source: z.string().optional(),
  sort: z.string().optional(),
  broaden: z.string().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = QuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
  const limit = Math.min(Number(q.limit || 50), 200);
  const broaden = (q.broaden || "0") === "1" || (q.broaden || "").toLowerCase() === "true";
  const sort = (q.sort || "balanced").toLowerCase() === "newest" ? "newest" : "balanced";

  const where: any = { isActive: true, language: "my" };
  if (q.category && q.category !== "ALL") where.category = q.category;
  if (q.source && q.source !== "ALL") where.sourceName = q.source;

  const headlines = await prisma.headline.findMany({
    where,
    orderBy: [{ fetchedAt: "desc" }],
    take: 1000,
  });

  const ranked = rankHeadlines(headlines, sort, broaden).slice(0, limit);

  // Also reported by... (cluster mates)
  const clusterIds = Array.from(new Set(ranked.map((h) => h.clusterId).filter(Boolean))) as string[];
  const clusterMates = await prisma.headline.findMany({
    where: { clusterId: { in: clusterIds }, isActive: true },
    select: { clusterId: true, sourceName: true, articleUrl: true },
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


  return NextResponse.json({ items: payload });
}
