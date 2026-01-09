import { NextResponse } from "next/server";
import { ingestAll } from "@/lib/ingest";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function POST(req: Request) {
  const token = process.env.ADMIN_REFRESH_TOKEN || "";
  const auth = req.headers.get("authorization") || "";
  const supplied = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || supplied !== token) return unauthorized();

  const stats = await ingestAll();
  return NextResponse.json({ ok: true, stats });
}
