import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchBrainFiles, fetchBrainFileContent } from "@/lib/github";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("admin_token")?.value;
  const body = await req.json().catch(() => ({}));
  let authed = cookieToken === process.env.TASKS_PASSWORD;

  if (!authed) {
    authed = body.password === process.env.TASKS_PASSWORD;
  }

  if (!authed) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const query = (body.query as string || "").toLowerCase().trim();
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const files = await fetchBrainFiles();
  const results: { path: string; name: string; snippet: string; matchCount: number }[] = [];

  await Promise.all(
    files.map(async (f) => {
      const content = await fetchBrainFileContent(f.path);
      if (!content) return;

      const lower = content.toLowerCase();
      let matchCount = 0;
      let idx = 0;
      while ((idx = lower.indexOf(query, idx)) !== -1) {
        matchCount++;
        idx += query.length;
      }

      if (matchCount === 0 && !f.name.toLowerCase().includes(query) && !f.path.toLowerCase().includes(query)) {
        return;
      }

      // Extract snippet around first match
      let snippet = "";
      const firstIdx = lower.indexOf(query);
      if (firstIdx !== -1) {
        const start = Math.max(0, firstIdx - 80);
        const end = Math.min(content.length, firstIdx + query.length + 80);
        snippet = content.slice(start, end).replace(/\n/g, " ");
        if (start > 0) snippet = "..." + snippet;
        if (end < content.length) snippet = snippet + "...";
      }

      results.push({ path: f.path, name: f.name, snippet, matchCount });
    })
  );

  results.sort((a, b) => b.matchCount - a.matchCount);

  return NextResponse.json({ results });
}
