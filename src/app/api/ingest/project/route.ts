import { NextRequest, NextResponse } from "next/server";
import { fetchProjectsDb, insertProjects, type ProjectInput } from "@/lib/db";
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

function validateProjects(projects: ProjectInput[]): string | null {
  for (const project of projects) {
    if (!project.title || project.title.trim().length === 0) {
      return "Each project requires title";
    }

    if (project.status && !isProjectStatus(project.status)) {
      return `Invalid status: ${project.status}. Must be one of: ${PROJECT_STATUSES.join(", ")}`;
    }

    if (project.kind && !isProjectKind(project.kind)) {
      return `Invalid kind: ${project.kind}. Must be one of: ${PROJECT_KINDS.join(", ")}`;
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  if (!checkIngestAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status") || undefined;
  const kind = req.nextUrl.searchParams.get("kind") || undefined;
  const q = req.nextUrl.searchParams.get("q") || undefined;

  if (status && !isProjectStatus(status)) {
    return NextResponse.json(
      { error: `Invalid status: ${status}. Must be one of: ${PROJECT_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  if (kind && !isProjectKind(kind)) {
    return NextResponse.json(
      { error: `Invalid kind: ${kind}. Must be one of: ${PROJECT_KINDS.join(", ")}` },
      { status: 400 }
    );
  }

  const projects = await fetchProjectsDb({ status, kind, q, includeArchived: true });
  return NextResponse.json({ ok: true, projects });
}

export async function POST(req: NextRequest) {
  if (!checkIngestAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const projects = body?.projects as ProjectInput[] | undefined;

  if (!Array.isArray(projects) || projects.length === 0) {
    return NextResponse.json(
      { error: "Missing required field: projects (non-empty array)" },
      { status: 400 }
    );
  }

  const validationError = validateProjects(projects);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const ids = await insertProjects(projects);
    return NextResponse.json({ ok: true, ids });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create projects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
