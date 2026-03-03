import { NextRequest, NextResponse } from "next/server";
import {
  fetchResearchArtifactsDb,
  insertResearchArtifact,
} from "@/lib/db";
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

export async function GET(req: NextRequest) {
  if (!checkIngestAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const domain = req.nextUrl.searchParams.get("domain") || undefined;
  const taskId = req.nextUrl.searchParams.get("task_id") || undefined;
  const projectId = req.nextUrl.searchParams.get("project_id") || undefined;
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  if (domain && !isResearchArtifactDomain(domain)) {
    return NextResponse.json(
      {
        error: `Invalid domain: ${domain}. Must be one of: ${RESEARCH_ARTIFACT_DOMAINS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  if (status && !isResearchArtifactStatus(status)) {
    return NextResponse.json(
      {
        error: `Invalid status: ${status}. Must be one of: ${RESEARCH_ARTIFACT_STATUSES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  if (limit !== undefined && !Number.isFinite(limit)) {
    return NextResponse.json({ error: "Invalid limit" }, { status: 400 });
  }

  const normalizedDomain = domain && isResearchArtifactDomain(domain) ? domain : undefined;
  const normalizedStatus = status && isResearchArtifactStatus(status) ? status : undefined;

  const artifacts = await fetchResearchArtifactsDb({
    domain: normalizedDomain,
    task_id: taskId,
    project_id: projectId,
    status: normalizedStatus,
    limit,
  });
  return NextResponse.json({ ok: true, artifacts });
}

export async function POST(req: NextRequest) {
  if (!checkIngestAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  if (!title || String(title).trim().length === 0) {
    return NextResponse.json({ error: "Missing required field: title" }, { status: 400 });
  }
  if (!domain || !isResearchArtifactDomain(domain)) {
    return NextResponse.json(
      {
        error: `Missing or invalid domain. Must be one of: ${RESEARCH_ARTIFACT_DOMAINS.join(", ")}`,
      },
      { status: 400 }
    );
  }
  if (!body_md || String(body_md).trim().length === 0) {
    return NextResponse.json({ error: "Missing required field: body_md" }, { status: 400 });
  }
  if (!created_by || String(created_by).trim().length === 0) {
    return NextResponse.json({ error: "Missing required field: created_by" }, { status: 400 });
  }

  if (status !== undefined && !isResearchArtifactStatus(status)) {
    return NextResponse.json(
      { error: `Invalid status: ${status}. Must be one of: ${RESEARCH_ARTIFACT_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  if (source_links !== undefined && !Array.isArray(source_links)) {
    return NextResponse.json({ error: "source_links must be an array when provided" }, { status: 400 });
  }

  try {
    const id = await insertResearchArtifact({
      title: String(title),
      domain,
      body_md: String(body_md),
      summary: summary ? String(summary) : undefined,
      task_id: task_id ? String(task_id) : undefined,
      project_id: project_id ? String(project_id) : undefined,
      product_id: product_id ? String(product_id) : undefined,
      created_by: String(created_by),
      source_links,
      status,
    });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create research artifact";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
