import { NextRequest, NextResponse } from "next/server";
import { fetchProjectById, updateProject } from "@/lib/db";
import {
  isProjectKind,
  isProjectStatus,
  PROJECT_KINDS,
  PROJECT_STATUSES,
} from "@/lib/projects";

function checkIngestAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice(7) === process.env.INGEST_API_KEY;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkIngestAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { title, slug, summary, status, kind } = body ?? {};

  if (title !== undefined && (!title || String(title).trim().length === 0)) {
    return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
  }

  if (slug !== undefined && (!slug || String(slug).trim().length === 0)) {
    return NextResponse.json({ error: "slug cannot be empty" }, { status: 400 });
  }

  if (status !== undefined && !isProjectStatus(status)) {
    return NextResponse.json(
      { error: `Invalid status: ${status}. Must be one of: ${PROJECT_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  if (kind !== undefined && !isProjectKind(kind)) {
    return NextResponse.json(
      { error: `Invalid kind: ${kind}. Must be one of: ${PROJECT_KINDS.join(", ")}` },
      { status: 400 }
    );
  }

  const hasAnyField =
    title !== undefined ||
    slug !== undefined ||
    summary !== undefined ||
    status !== undefined ||
    kind !== undefined;

  if (!hasAnyField) {
    return NextResponse.json({ error: "No fields provided" }, { status: 400 });
  }

  const existing = await fetchProjectById(id);
  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const updated = await updateProject(id, {
      title: title !== undefined ? String(title) : undefined,
      slug: slug !== undefined ? String(slug) : undefined,
      summary: summary !== undefined ? (summary === null ? null : String(summary)) : undefined,
      status: status !== undefined ? status : undefined,
      kind: kind !== undefined ? kind : undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
