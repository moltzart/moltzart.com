import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (password !== process.env.TASKS_PASSWORD) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const ghToken = process.env.GITHUB_TOKEN;
  if (!ghToken) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const res = await fetch(
    "https://api.github.com/repos/moltzart/openclaw-home/contents/research",
    {
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: "application/vnd.github.v3+json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch research list" }, { status: 502 });
  }

  const files = await res.json();
  const mdFiles = files.filter((f: { name: string }) => f.name.endsWith(".md"));

  // Fetch commit dates for each file in parallel
  const docs = await Promise.all(
    mdFiles.map(async (f: { name: string; sha: string }) => {
      const slug = f.name.replace(/\.md$/, "");
      const title = slug
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

      let createdAt: string | null = null;
      try {
        // Get the earliest commit for this file
        const commitsRes = await fetch(
          `https://api.github.com/repos/moltzart/openclaw-home/commits?path=research/${encodeURIComponent(f.name)}&per_page=1`,
          {
            headers: {
              Authorization: `Bearer ${ghToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );
        if (commitsRes.ok) {
          // GitHub returns newest first; Link header has last page for oldest
          const linkHeader = commitsRes.headers.get("link");
          const commits = await commitsRes.json();

          if (linkHeader && linkHeader.includes('rel="last"')) {
            // Multiple pages — fetch the last page for the oldest commit
            const lastMatch = linkHeader.match(/<([^>]+)>;\s*rel="last"/);
            if (lastMatch) {
              const lastRes = await fetch(lastMatch[1], {
                headers: {
                  Authorization: `Bearer ${ghToken}`,
                  Accept: "application/vnd.github.v3+json",
                },
              });
              if (lastRes.ok) {
                const lastCommits = await lastRes.json();
                const oldest = lastCommits[lastCommits.length - 1];
                createdAt = oldest?.commit?.author?.date || null;
              }
            }
          } else if (commits.length > 0) {
            // Single page — oldest is the last item
            createdAt = commits[commits.length - 1]?.commit?.author?.date || null;
          }
        }
      } catch {
        // Fall back to no date
      }

      return { slug, title, sha: f.sha, createdAt };
    })
  );

  // Sort by createdAt descending (newest first), nulls last
  docs.sort((a: { createdAt: string | null }, b: { createdAt: string | null }) => {
    if (!a.createdAt && !b.createdAt) return 0;
    if (!a.createdAt) return 1;
    if (!b.createdAt) return -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return NextResponse.json({ docs });
}
