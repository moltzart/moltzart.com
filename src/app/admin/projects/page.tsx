import { fetchProjectsDb, fetchResearchArtifactsDb } from "@/lib/db";
import { ProjectsView } from "@/components/projects-view";
import { PageHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const [allProjects, unassignedArtifacts] = await Promise.all([
    fetchProjectsDb({ includeArchived: true }),
    fetchResearchArtifactsDb({ unassigned: true, limit: 500 }),
  ]);

  const activeProjects = allProjects.filter((p) => p.status !== "archived");
  const archivedCount = allProjects.length - activeProjects.length;

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" />

      <ProjectsView
        projects={activeProjects}
        unassignedArtifacts={unassignedArtifacts}
        archivedCount={archivedCount}
      />
    </div>
  );
}
