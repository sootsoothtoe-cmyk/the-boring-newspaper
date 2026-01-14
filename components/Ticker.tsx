"use client";

import { useEffect, useMemo, useState } from "react";

type TickerItem = {
  id: string;
  sourceName: string;
  articleUrl: string;
  category: string;
  displayTitle: string;
  usedOriginalFallback: boolean;
  publishedAt: string | null;
  fetchedAt: string;
};

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("my-MM", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function Ticker() {
  const [items, setItems] = useState<TickerItem[]>([]);

  async function load() {
    const res = await fetch("/api/ticker", { cache: "no-store" });
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => {
    load().catch(() => {});
    const handler = () => load().catch(() => {});
    window.addEventListener("boringnews:refresh", handler);
    return () => window.removeEventListener("boringnews:refresh", handler);
  }, []);

  const doubled = useMemo(() => [...items, ...items], [items]);

  return (
    <div className="w-full border-b border-neutral-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-2">
        <div className="marquee text-sm md:text-base" style={{ ["--marquee-duration" as any]: "160s" }} aria-label="Ticker">
          <div className="marquee-track">
            {doubled.map((it, idx) => {
              const timeIso = it.publishedAt || it.fetchedAt;
              return (
                <span key={`${it.id}-${idx}`} className="mr-10 inline-flex items-baseline gap-2">
                  <a href={it.articleUrl} target="_blank" rel="noreferrer" className="no-underline hover:underline">
                    {it.displayTitle}
                  </a>
                  {it.usedOriginalFallback ? <span className="text-neutral-500 text-xs">(original)</span> : null}
                  <span className="text-neutral-500 text-xs">— {it.sourceName}</span>
                  <span className="text-neutral-400 text-xs">{formatTime(timeIso)}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
