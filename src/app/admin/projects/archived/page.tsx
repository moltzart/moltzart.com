import Link from "next/link";
import { Archive } from "lucide-react";
import { fetchProjectsDb } from "@/lib/db";
import { AdminPageIntro } from "@/components/admin/admin-page-intro";
import { EmptyState } from "@/components/admin/empty-state";
import { KindTag } from "@/components/admin/tag-badge";
import { formatShortDate } from "@/lib/date-format";

export const dynamic = "force-dynamic";

export default async function ArchivedProjectsPage() {
  const projects = await fetchProjectsDb({ status: "archived" });

  return (
    <div className="space-y-6">
      <AdminPageIntro
        title="Archived Projects"
        breadcrumbs={[
          { label: "Projects", href: "/admin/projects" },
          { label: "Archived" },
        ]}
      />

      {projects.length === 0 ? (
        <EmptyState icon={Archive} message="No archived projects." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800/50 bg-zinc-900/30">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/50 bg-zinc-900/80">
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">Project</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">Kind</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-zinc-400">Updated</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b border-zinc-800/30 last:border-0">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/projects/${project.slug}`}
                      className="type-body-sm font-medium text-zinc-200 transition-colors hover:text-zinc-50"
                    >
                      {project.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    {project.kind === "product" && <KindTag kind={project.kind} />}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="type-body-sm text-zinc-600">
                      {formatShortDate(project.updated_at)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
