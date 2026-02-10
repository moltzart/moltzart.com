import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { password } = await req.json();
  const { slug } = await params;

  if (password !== process.env.TASKS_PASSWORD) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const ghToken = process.env.GITHUB_TOKEN;
  if (!ghToken) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const res = await fetch(
    `https://api.github.com/repos/moltzart/openclaw-home/contents/research/${encodeURIComponent(slug)}.md`,
    {
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: "application/vnd.github.v3+json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const fileData = await res.json();
  const content = Buffer.from(fileData.content, "base64").toString("utf-8");

  // Extract title from first H1
  const titleMatch = content.match(/^#\s+(.+)/m);
  const title = titleMatch ? titleMatch[1] : slug.replace(/-/g, " ");

  return NextResponse.json({ title, content, sha: fileData.sha });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { password } = await req.json();
  const { slug } = await params;

  if (password !== process.env.TASKS_PASSWORD) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const ghToken = process.env.GITHUB_TOKEN;
  if (!ghToken) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // First get the file SHA
  const fileRes = await fetch(
    `https://api.github.com/repos/moltzart/openclaw-home/contents/research/${encodeURIComponent(slug)}.md`,
    {
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!fileRes.ok) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const fileData = await fileRes.json();

  // Delete the file
  const deleteRes = await fetch(
    `https://api.github.com/repos/moltzart/openclaw-home/contents/research/${encodeURIComponent(slug)}.md`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Delete research: ${slug}`,
        sha: fileData.sha,
      }),
    }
  );

  if (!deleteRes.ok) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
