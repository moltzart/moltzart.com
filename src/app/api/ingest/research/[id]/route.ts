import { NextRequest, NextResponse } from "next/server";
import { updateResearchArtifact } from "@/lib/db";
import {
  isResearchArtifactDomain,
  isResearchArtifactStatus,
  RESEARCH_ARTIFACT_DOMAINS,
  RESEARCH_ARTIFACT_STATUSES,
} from "@/lib/research-artifacts";

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
  const {
    title,
    domain,
    body_md,
    summary,
    task_id,
    project_id,
    product_id,
    created_by,
    source_links,
    status,
  } = body ?? {};

  if (domain !== undefined && !isResearchArtifactDomain(domain)) {
    return NextResponse.json(
      { error: `Invalid domain: ${domain}. Must be one of: ${RESEARCH_ARTIFACT_DOMAINS.join(", ")}` },
      { status: 400 }
    );
  }

  if (status !== undefined && !isResearchArtifactStatus(status)) {
    return NextResponse.json(
      { error: `Invalid status: ${status}. Must be one of: ${RESEARCH_ARTIFACT_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  if (source_links !== undefined && source_links !== null && !Array.isArray(source_links)) {
    return NextResponse.json({ error: "source_links must be an array or null when provided" }, { status: 400 });
  }

  const hasAnyField =
    title !== undefined ||
    domain !== undefined ||
    body_md !== undefined ||
    summary !== undefined ||
    task_id !== undefined ||
    project_id !== undefined ||
    product_id !== undefined ||
    created_by !== undefined ||
    source_links !== undefined ||
    status !== undefined;

  if (!hasAnyField) {
    return NextResponse.json({ error: "No fields provided" }, { status: 400 });
  }

  const updated = await updateResearchArtifact(id, {
    title: title !== undefined ? String(title) : undefined,
    domain: domain !== undefined ? domain : undefined,
    body_md: body_md !== undefined ? String(body_md) : undefined,
    summary: summary !== undefined ? (summary === null ? null : String(summary)) : undefined,
    task_id: task_id !== undefined ? (task_id === null ? null : String(task_id)) : undefined,
    project_id: project_id !== undefined ? (project_id === null ? null : String(project_id)) : undefined,
    product_id: product_id !== undefined ? (product_id === null ? null : String(product_id)) : undefined,
    created_by: created_by !== undefined ? String(created_by) : undefined,
    source_links,
    status: status !== undefined ? status : undefined,
  });

  if (!updated) {
    return NextResponse.json({ error: "Research artifact not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
