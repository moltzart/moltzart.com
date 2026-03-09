"use client";

import Link from "next/link";
import { Archive, Briefcase, ChevronRight, Inbox } from "lucide-react";
import type { DbProject, DbResearchArtifact } from "@/lib/db";
import { EmptyState } from "@/components/admin/empty-state";
import { SortableDataTable, type Column } from "@/components/admin/sortable-data-table";
import { DomainTag, KindTag, StatusTag } from "@/components/admin/tag-badge";
import { formatShortDate } from "@/lib/date-format";

/* ------------------------------------------------------------------ */
/*  Projects view                                                     */
/* ------------------------------------------------------------------ */

const projectColumns: Column<DbProject>[] = [
  {
    key: "title",
    label: "Project",
    render: (p) => p.title,
    sortValue: (p) => p.title,
  },
  {
    key: "status",
    label: "Status",
    render: (p) => <StatusTag status={p.status} />,
    sortValue: (p) => p.status,
  },
  {
    key: "kind",
    label: "Kind",
    render: (p) => <KindTag kind={p.kind} />,
    sortValue: (p) => p.kind,
  },
  {
    key: "artifacts",
    label: "Artifacts",
    render: (p) => p.artifact_count,
    sortValue: (p) => p.artifact_count,
  },
  {
    key: "updated",
    label: "Updated",
    render: (p) => formatShortDate(p.updated_at),
    sortValue: (p) => p.updated_at,
  },
];

const triageColumns: Column<DbResearchArtifact>[] = [
  {
    key: "title",
    label: "Artifact",
    render: (a) => a.title,
    sortValue: (a) => a.title,
  },
  {
    key: "domain",
    label: "Domain",
    render: (a) => <DomainTag domain={a.domain} />,
    sortValue: (a) => a.domain,
  },
  {
    key: "created",
    label: "Date",
    render: (a) => formatShortDate(a.created_at),
    sortValue: (a) => a.created_at,
  },
];

interface ProjectsViewProps {
  projects: DbProject[];
  unassignedArtifacts: DbResearchArtifact[];
  archivedCount: number;
}

export function ProjectsView({ projects, unassignedArtifacts, archivedCount }: ProjectsViewProps) {
  if (projects.length === 0 && unassignedArtifacts.length === 0 && archivedCount === 0) {
    return <EmptyState icon={Briefcase} message="No projects yet." />;
  }

  return (
    <div className="space-y-10">
      {projects.length > 0 && (
        <SortableDataTable
          columns={projectColumns}
          rows={projects}
          rowHref={(p) => `/admin/projects/${p.slug}`}
        />
      )}

      {unassignedArtifacts.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-3">
            <Inbox size={14} className="shrink-0 text-amber-400" />
            <h2 className="type-label text-amber-400">Triage</h2>
            <span className="type-badge text-zinc-600">{unassignedArtifacts.length}</span>
          </div>
          <SortableDataTable
            columns={triageColumns}
            rows={unassignedArtifacts}
            rowHref={(a) => `/admin/research/${a.id}`}
          />
        </section>
      )}

      {archivedCount > 0 && (
        <section>
          <Link
            href="/admin/projects/archived"
            className="group inline-flex items-center gap-2 text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <Archive size={14} className="shrink-0" />
            <span className="type-body-sm">
              {archivedCount} archived {archivedCount === 1 ? "project" : "projects"}
            </span>
            <ChevronRight size={14} className="shrink-0 text-zinc-700 transition-colors group-hover:text-zinc-400" />
          </Link>
        </section>
      )}
    </div>
  );
}
