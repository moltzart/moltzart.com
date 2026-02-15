import { NextRequest, NextResponse } from "next/server";
import { insertNewsletterArticles } from "@/lib/db";

function checkIngestAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice(7) === process.env.INGEST_API_KEY;
}

export async function POST(req: NextRequest) {
  if (!checkIngestAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { digest_date, articles } = body;

  if (!digest_date || !Array.isArray(articles) || articles.length === 0) {
    return NextResponse.json({ error: "Missing required fields: digest_date, articles (non-empty array)" }, { status: 400 });
  }

  for (const a of articles) {
    if (!a.title) {
      return NextResponse.json({ error: "Each article requires a title" }, { status: 400 });
    }
  }

  const ids = await insertNewsletterArticles(digest_date, articles);
  return NextResponse.json({ ok: true, ids });
}
