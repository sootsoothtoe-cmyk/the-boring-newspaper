"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  displayTitle: string;
  neutralTitle: string | null;
  originalTitle: string;
  usedOriginalFallback: boolean;
  articleUrl: string;
  sourceName: string;
  category: string;
  publishedAt: string | null;
  fetchedAt: string;
  clusterId: string | null;
  alsoReportedBy: { sourceName: string; articleUrl: string }[];
};

type Source = { name: string; url: string; lastFetchedAt: string | null; lastError: string | null };

const CATEGORY_LABELS: Record<string, string> = {
  POLITICS_CONFLICT: "Politics / Conflict",
  ECONOMY_BUSINESS: "Economy / Business",
  SOCIETY: "Society",
  HEALTH: "Health",
  EDUCATION: "Education",
  ENVIRONMENT: "Environment",
  INTERNATIONAL: "International",
  CRIME_COURTS: "Crime / Courts",
  TECH: "Tech",
  CULTURE: "Culture",
  OTHER: "Other",
};

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("my-MM", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function HeadlineList() {
  const [items, setItems] = useState<Item[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [category, setCategory] = useState<string>("ALL");
  const [source, setSource] = useState<string>("ALL");
  const [sort, setSort] = useState<"balanced" | "newest">("balanced");
  const [broaden, setBroaden] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const categories = useMemo(() => ["ALL", ...Object.keys(CATEGORY_LABELS)], []);

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams({
      limit: "80",
      category,
      source,
      sort,
      broaden: broaden ? "1" : "0",
    });
    const res = await fetch(`/api/headlines?${qs.toString()}`, { cache: "no-store" });
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  async function loadSources() {
    const res = await fetch(`/api/sources`, { cache: "no-store" });
    const data = await res.json();
    setSources(data.sources || []);
  }

  useEffect(() => {
    loadSources().catch(() => {});
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, source, sort, broaden]);

  function refreshAll() {
    load().catch(() => setLoading(false));
    window.dispatchEvent(new Event("boringnews:refresh"));
  }

  return (
    <div className="container-max py-6">
      <header className="mb-6">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">The Boring Newspaper</h1>
          <a className="text-sm text-neutral-600 no-underline hover:underline" href="/health" target="_blank" rel="noreferrer">
            /health
          </a>
        </div>
        <p className="mt-2 text-sm text-neutral-600">
          Burmese-first headline aggregator. Neutral rewrites by default. No feeds, no rage-bait.
        </p>
      </header>

      <section className="mb-5 flex flex-wrap gap-2 items-center">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              className={`chip ${category === c ? "chip-active" : ""}`}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              title={c === "ALL" ? "All categories" : CATEGORY_LABELS[c] || c}
            >
              {c === "ALL" ? "All" : (CATEGORY_LABELS[c] || c)}
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap gap-2 items-center">
          <select className="select" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="ALL">All sources</option>
            {sources.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          <select className="select" value={sort} onChange={(e) => setSort(e.target.value as any)}>
            <option value="balanced">Balanced</option>
            <option value="newest">Newest</option>
          </select>

          <label className="toggle">
            <input type="checkbox" checked={broaden} onChange={(e) => setBroaden(e.target.checked)} />
            Broaden my view
          </label>

          <button className="btn" onClick={refreshAll} disabled={loading}>
            Refresh
          </button>
        </div>
      </section>

      <main className="mt-5">
        {loading ? <p className="text-sm text-neutral-600">Loading…</p> : null}

        <ul className="space-y-4">
          {items.map((it) => (
            <HeadlineRow key={it.id} it={it} />
          ))}
        </ul>

        <footer className="mt-10 text-xs text-neutral-500">
          <p>
            Headlines-only. No full-article scraping. If a source breaks, the site keeps serving the last known items from that source.
          </p>
        </footer>
      </main>
    </div>
  );
}

function HeadlineRow({ it }: { it: Item }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const timeIso = it.publishedAt || it.fetchedAt;

  return (
    <li className="border-b border-neutral-200 pb-4">
      <div className="flex flex-col gap-2">
        <a href={it.articleUrl} target="_blank" rel="noreferrer" className="no-underline hover:underline">
          <div className="text-lg leading-snug font-medium">
            {it.displayTitle} {it.usedOriginalFallback ? <span className="text-xs text-neutral-500">(original)</span> : null}
          </div>
        </a>

        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600">
          <span className="badge">{it.sourceName}</span>
          <span className="badge">{CATEGORY_LABELS[it.category] || it.category}</span>
          <span className="text-neutral-500">{formatTime(timeIso)}</span>

          <button className="btn !px-2 !py-1" onClick={() => setShowOriginal((v) => !v)}>
            {showOriginal ? "Hide original" : "Show original"}
          </button>
        </div>

        {showOriginal ? (
          <div className="text-sm text-neutral-700 border-l-2 border-neutral-200 pl-3">
            {it.originalTitle}
          </div>
        ) : null}

        {it.alsoReportedBy?.length ? (
          <div className="text-xs text-neutral-600">
            Also reported by:{" "}
            {it.alsoReportedBy.slice(0, 6).map((s, idx) => (
              <span key={s.articleUrl}>
                {idx ? ", " : ""}
                <a href={s.articleUrl} target="_blank" rel="noreferrer" className="no-underline hover:underline">
                  {s.sourceName}
                </a>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
}
