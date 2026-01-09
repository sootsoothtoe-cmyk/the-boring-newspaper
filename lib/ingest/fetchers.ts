import Parser from "rss-parser";
import * as cheerio from "cheerio";
import { containsMyanmarScript } from "@/lib/text/normalize";
import type { ParsedHeadline } from "@/lib/types";

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "TheBoringNewspaperBot/0.1 (respect robots.txt; headlines-only)" },
});

function absolutize(baseUrl: string, href: string): string {
  try { return new URL(href, baseUrl).toString(); } catch { return href; }
}

async function tryRss(url: string): Promise<ParsedHeadline[]> {
  const feed = await parser.parseURL(url);
  const items: ParsedHeadline[] = [];
  for (const it of feed.items || []) {
    const link = (it.link || "").trim();
    const title = (it.title || "").trim();
    if (!link || !title) continue;
    const pub = it.isoDate ? new Date(it.isoDate) : (it.pubDate ? new Date(it.pubDate) : null);
    items.push({
      sourceName: feed.title?.trim() || "Unknown",
      sourceUrl: url,
      articleUrl: link,
      originalTitle: title,
      publishedAt: isFinite(pub?.getTime() || NaN) ? pub : null,
    });
  }
  return items;
}

export async function discoverAndFetch(
  sourceName: string,
  sourceUrl: string,
  maxItems: number
): Promise<Omit<ParsedHeadline, "sourceName" | "sourceUrl">[]> {
  const candidates = [
    new URL("feed", sourceUrl).toString(),
    new URL("rss", sourceUrl).toString(),
    new URL("rss.xml", sourceUrl).toString(),
    new URL("atom.xml", sourceUrl).toString(),
  ];

  // 1) Try common RSS paths
  for (const c of candidates) {
    try {
      const items = await tryRss(c);
      if (items.length) {
        return items.slice(0, maxItems).map((x) => ({
          articleUrl: x.articleUrl,
          originalTitle: x.originalTitle,
          publishedAt: x.publishedAt ?? null,
        }));
      }
    } catch {
      // ignore
    }
  }

  // 2) Discover RSS link in homepage
  try {
    const res = await fetch(sourceUrl, { headers: { "User-Agent": "TheBoringNewspaperBot/0.1" } });
    const html = await res.text();
    const $ = cheerio.load(html);
    const rssHref = $('link[rel="alternate"][type*="rss"], link[rel="alternate"][type*="atom"]').attr("href");
    if (rssHref) {
      const rssUrl = absolutize(sourceUrl, rssHref);
      try {
        const items = await tryRss(rssUrl);
        if (items.length) {
          return items.slice(0, maxItems).map((x) => ({
            articleUrl: x.articleUrl,
            originalTitle: x.originalTitle,
            publishedAt: x.publishedAt ?? null,
          }));
        }
      } catch {/* ignore */}
    }
  } catch {/* ignore */}

  // 3) Fallback: scrape homepage headlines heuristically
  return await scrapeHeadlinesHeuristic(sourceUrl, maxItems);
}

export async function scrapeHeadlinesHeuristic(sourceUrl: string, maxItems: number) {
  const res = await fetch(sourceUrl, { headers: { "User-Agent": "TheBoringNewspaperBot/0.1" } });
  const html = await res.text();
  const $ = cheerio.load(html);

  const seen = new Set<string>();
  const items: { articleUrl: string; originalTitle: string; publishedAt: Date | null }[] = [];

  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    let text = $(el).text().replace(/\s+/g, " ").trim();

    if (!href || !text) return;
    if (text.length < 10 || text.length > 140) return;
    if (!containsMyanmarScript(text)) return;

    const url = absolutize(sourceUrl, href);
    // ignore javascript links & fragments
    if (!/^https?:\/\//.test(url)) return;
    if (url.includes("#")) return;

    // Deduplicate
    const key = (url + "|" + text).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    items.push({ articleUrl: url, originalTitle: text, publishedAt: null });
  });

  return items.slice(0, maxItems);
}
