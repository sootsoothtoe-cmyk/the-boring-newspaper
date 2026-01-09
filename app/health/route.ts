import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const sources = await prisma.source.findMany({
    select: { name: true, url: true, lastFetchedAt: true, lastError: true },
    orderBy: { name: "asc" },
  });

  const lastFetch = sources.reduce<Date | null>((acc, s) => {
    if (!s.lastFetchedAt) return acc;
    if (!acc || s.lastFetchedAt > acc) return s.lastFetchedAt;
    return acc;
  }, null);

  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
    lastFetch,
    sources,
  });
}
