import crypto from "crypto";
import { prisma } from "@/lib/db";
import { SOURCES } from "@/lib/ingest/sources/list";
import { discoverAndFetch } from "@/lib/ingest/fetchers";
import { rewriteHeadline } from "@/lib/rewrite";
import { categorizeMyanmarTitle } from "@/lib/categorize";
import { makeDedupeKey, assignClusterForHeadline } from "@/lib/dedupe";
import type { IngestStats } from "@/lib/types";

function stableId(sourceUrl: string, articleUrl: string): string {
  return crypto.createHash("sha256").update(sourceUrl + "|" + articleUrl).digest("hex").slice(0, 40);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function ensureSourcesInDb() {
  for (const s of SOURCES) {
    await prisma.source.upsert({
      where: { name: s.name },
      update: { url: s.url, isActive: true },
      create: { name: s.name, url: s.url, isActive: true },
    });
  }
}

export async function ingestAll(): Promise<IngestStats> {
  const startedAt = new Date().toISOString();
  const perDelay = Number(process.env.PER_SOURCE_DELAY_MS || 800);
  const maxPerSource = Number(process.env.MAX_HEADLINES_PER_SOURCE || 50);

  await ensureSourcesInDb();

  const stats: IngestStats["bySource"] = {};
  for (const s of SOURCES) stats[s.name] = { fetched: 0, stored: 0, errors: 0 };

  for (const src of SOURCES) {
    const s = stats[src.name];
    try {
      const items = await discoverAndFetch(src.name, src.url, maxPerSource);
      s.fetched = items.length;

      // Update lastFetchedAt
      await prisma.source.update({ where: { name: src.name }, data: { lastFetchedAt: new Date(), lastError: null } });

      for (const item of items) {
        const id = stableId(src.url, item.articleUrl);

        const existing = await prisma.headline.findUnique({ where: { id } });
        if (existing && existing.originalTitle === item.originalTitle) continue;

        const rewrite = await rewriteHeadline(item.originalTitle);
        const neutralTitle = (rewrite.neutralTitle || "").trim() || item.originalTitle.trim();
        const rewriteMode = rewrite.rewriteMode || "rules";
        const rewriteFlags = rewrite.rewriteFlags || [];

        if (process.env.DEBUG_REWRITE === "1") {
          const changed = neutralTitle.trim() !== item.originalTitle.trim();
          // eslint-disable-next-line no-console
          console.log(`[rewrite] ${src.name} changed=${changed} flags=${rewriteFlags.join(",") || "-"}\n  orig: ${item.originalTitle}\n  neut: ${neutralTitle}`);
        }

        const category = categorizeMyanmarTitle(neutralTitle);
        const dedupeKey = makeDedupeKey(neutralTitle);

        await prisma.headline.upsert({
          where: { id },
          update: {
            originalTitle: item.originalTitle,
            neutralTitle,
            rewriteFlags,
            rewriteMode,
            publishedAt: item.publishedAt ?? null,
            fetchedAt: new Date(),
            category,
            dedupeKey,
            sourceName: src.name,
            sourceUrl: src.url,
            articleUrl: item.articleUrl,
            isActive: true,
          },
          create: {
            id,
            sourceName: src.name,
            sourceUrl: src.url,
            articleUrl: item.articleUrl,
            originalTitle: item.originalTitle,
            neutralTitle,
            rewriteFlags,
            rewriteMode,
            publishedAt: item.publishedAt ?? null,
            fetchedAt: new Date(),
            category,
            dedupeKey,
            isActive: true,
          },
        });

        // cluster assignment (best-effort)
        await assignClusterForHeadline(id, dedupeKey);
        s.stored += 1;
      }
    } catch (err: any) {
      s.errors += 1;
      s.lastError = String(err?.message || err);
      await prisma.source.update({
        where: { name: src.name },
        data: { lastError: s.lastError, lastFetchedAt: new Date() },
      });
    }

    await sleep(perDelay);
  }

  const finishedAt = new Date().toISOString();
  return { bySource: stats, startedAt, finishedAt };
}
