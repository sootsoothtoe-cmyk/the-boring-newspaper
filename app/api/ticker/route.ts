export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rankHeadlines } from "@/lib/ranking";

export async function GET() {
  const pool = await prisma.headline.findMany({
    where: { isActive: true, language: "my" },
    orderBy: [{ fetchedAt: "desc" }],
    take: 1500,
  });

  const ranked = rankHeadlines(pool, "balanced", true);

  const target = 20;
  const maxPerSource = 4;
  const maxPerCategory = 5;

  const out: any[] = [];
  const sourceCount: Record<string, number> = {};
  const catCount: Record<string, number> = {};

  for (const h of ranked) {
    const neutral = (h.neutralTitle || "").trim();
    const usedOriginalFallback = neutral.length === 0;
    const displayTitle = usedOriginalFallback ? h.originalTitle : neutral;

    if ((sourceCount[h.sourceName] || 0) >= maxPerSource) continue;
    if ((catCount[h.category] || 0) >= maxPerCategory) continue;

    out.push({
      id: h.id,
      sourceName: h.sourceName,
      articleUrl: h.articleUrl,
      category: h.category,
      displayTitle,
      usedOriginalFallback,
      publishedAt: h.publishedAt,
      fetchedAt: h.fetchedAt,
    });

    sourceCount[h.sourceName] = (sourceCount[h.sourceName] || 0) + 1;
    catCount[h.category] = (catCount[h.category] || 0) + 1;

    if (out.length >= target) break;
  }

  return NextResponse.json({ items: out });
}
