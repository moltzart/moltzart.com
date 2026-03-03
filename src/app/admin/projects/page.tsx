import { Briefcase } from "lucide-react";
import { fetchProjectsDb } from "@/lib/db";
import { Panel } from "@/components/admin/panel";
import { ProjectsView } from "@/components/projects-view";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const projects = await fetchProjectsDb({ includeArchived: true });

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Briefcase size={14} className="text-teal-500" />
            <span className="type-body-sm font-medium text-zinc-200">Projects</span>
          </div>
          <span className="type-body-sm text-zinc-600">{projects.length} total</span>
        </div>
      </Panel>

      <ProjectsView projects={projects} />
    </div>
  );
}
