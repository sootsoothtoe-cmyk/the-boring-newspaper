import { prisma } from "@/lib/db";
import { normalizeMyanmarText } from "@/lib/text/normalize";
import fuzzball from "fuzzball";

export function makeDedupeKey(title: string): string {
  return normalizeMyanmarText(title).toLowerCase();
}

export async function assignClusterForHeadline(headlineId: string, dedupeKey: string): Promise<string | null> {
  // Look back a few days to keep the search bounded.
  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const candidates = await prisma.headline.findMany({
    where: {
      fetchedAt: { gte: since },
      clusterId: { not: null },
      dedupeKey: { not: "" },
    },
    select: { id: true, dedupeKey: true, clusterId: true },
    take: 4000,
    orderBy: { fetchedAt: "desc" },
  });

  let best: { clusterId: string; score: number } | null = null;
  for (const c of candidates) {
    if (!c.clusterId) continue;
    const s = ratio(dedupeKey, c.dedupeKey);
    if (s >= 92) {
      if (!best || s > best.score) best = { clusterId: c.clusterId, score: s };
    }
  }

  if (best) {
    await prisma.headline.update({ where: { id: headlineId }, data: { clusterId: best.clusterId } });
    return best.clusterId;
  }

  // Create new cluster (MVP: clusterId is a stable short hash of headlineId)
  const clusterId = headlineId.slice(0, 16);
  await prisma.headline.update({ where: { id: headlineId }, data: { clusterId } });
  return clusterId;
}
