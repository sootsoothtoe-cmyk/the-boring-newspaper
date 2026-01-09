import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const sources = await prisma.source.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { name: true, url: true, lastFetchedAt: true, lastError: true },
  });
  return NextResponse.json({ sources });
}
