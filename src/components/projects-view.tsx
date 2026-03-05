"use client";

import Link from "next/link";
import { Briefcase, ChevronRight } from "lucide-react";
import type { DbProject } from "@/lib/db";
import type { ProjectStatus } from "@/lib/projects";
import { STATUS_META } from "@/lib/projects";
import { Panel } from "@/components/admin/panel";
import { EmptyState } from "@/components/admin/empty-state";

const STATUS_ORDER: ProjectStatus[] = [
  "idea",
  "researching",
  "building",
  "launched",
  "archived",
];

function formatDate(input: string): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ProjectsView({ projects }: { projects: DbProject[] }) {
  if (projects.length === 0) {
    return <EmptyState icon={Briefcase} message="No projects yet." />;
  }

  return (
    <div className="space-y-4">
      {STATUS_ORDER.map((status) => {
        const items = projects.filter((p) => p.status === status);
        if (items.length === 0) return null;
        const Icon = STATUS_META[status].icon;

        return (
          <Panel key={status} className="flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/30">
              <div className="flex items-center gap-2">
                <Icon size={14} className={STATUS_META[status].tone} />
                <span className={`type-body-sm font-medium ${STATUS_META[status].tone}`}>
                  {STATUS_META[status].label}
                </span>
              </div>
              <span className="type-body-sm text-zinc-500">{items.length} projects</span>
            </div>

            <div className="divide-y divide-zinc-800/30">
              {items.map((project) => (
                <Link
                  key={project.id}
                  href={`/admin/projects/${project.slug}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="type-body-sm font-medium text-zinc-200 group-hover:text-zinc-100 truncate">
                        {project.title}
                      </p>
                      <span className="type-badge text-zinc-500">{project.kind}</span>
                    </div>
                    {project.summary && (
                      <p className="type-body-sm text-zinc-500 mt-1 line-clamp-2">{project.summary}</p>
                    )}
                    <p className="type-body-sm text-zinc-600 mt-1">
                      Updated {formatDate(project.updated_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-1">
                    <span className="type-body-sm text-zinc-500">
                      {project.artifact_count} research
                    </span>
                    <ChevronRight size={14} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
