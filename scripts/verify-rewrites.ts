import { prisma } from "@/lib/db";

function truncate(s: string, n: number) {
  const t = (s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

async function main() {
  const arg = process.argv[2];
  const limit = arg ? Math.max(1, Math.min(200, Number(arg))) : 25;

  const rows = await prisma.headline.findMany({
    where: { isActive: true, language: "my" },
    orderBy: [{ fetchedAt: "desc" }],
    take: limit,
  });

  let changedCount = 0;
  let fallbackCount = 0;

  const out = rows.map((h) => {
    const neutral = (h.neutralTitle || "").trim();
    const usedOriginalFallback = neutral.length === 0;
    const displayTitle = usedOriginalFallback ? h.originalTitle : neutral;
    const changed = !usedOriginalFallback && neutral.trim() !== h.originalTitle.trim();

    if (changed) changedCount += 1;
    if (usedOriginalFallback) fallbackCount += 1;

    return {
      source: h.sourceName,
      changed,
      usedOriginalFallback,
      flags: Array.isArray(h.rewriteFlags) ? (h.rewriteFlags as any[]).join(",") : "",
      originalTitle: truncate(h.originalTitle, 90),
      neutralTitle: truncate(neutral || "", 90),
      displayTitle: truncate(displayTitle, 90),
    };
  });

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ summary: { limit, changedCount, fallbackCount }, items: out }, null, 2));
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
