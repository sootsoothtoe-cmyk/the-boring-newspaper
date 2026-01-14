import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(req: Request) {
  const token = process.env.ADMIN_REFRESH_TOKEN || "";
  const auth = req.headers.get("authorization") || "";
  const supplied = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || supplied !== token) return unauthorized();

  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit") || "25";
  const limit = Math.max(1, Math.min(200, Number(limitParam) || 25));

  const rows = await prisma.headline.findMany({
    where: { isActive: true, language: "my" },
    orderBy: [{ fetchedAt: "desc" }],
    take: limit,
  });

  let changedCount = 0;
  let fallbackCount = 0;

  const items = rows.map((h) => {
    const neutral = (h.neutralTitle || "").trim();
    const usedOriginalFallback = neutral.length === 0;
    const displayTitle = usedOriginalFallback ? h.originalTitle : neutral;
    const changed = !usedOriginalFallback && neutral.trim() !== h.originalTitle.trim();

    if (changed) changedCount += 1;
    if (usedOriginalFallback) fallbackCount += 1;

    return {
      id: h.id,
      sourceName: h.sourceName,
      category: h.category,
      originalTitle: h.originalTitle,
      neutralTitle: neutral || null,
      displayTitle,
      usedOriginalFallback,
      rewriteMode: h.rewriteMode,
      rewriteFlags: h.rewriteFlags,
      changed,
      fetchedAt: h.fetchedAt,
      publishedAt: h.publishedAt,
      articleUrl: h.articleUrl,
    };
  });

  return NextResponse.json({
    summary: { limit, changedCount, fallbackCount },
    items,
  });
}
