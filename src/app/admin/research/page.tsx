import Link from "next/link";
import { ChevronRight, FileSearch } from "lucide-react";
import { fetchResearchArtifactsDb, fetchProjectsDb, type DbResearchArtifact, type DbProject } from "@/lib/db";
import { Panel } from "@/components/admin/panel";
import { EmptyState } from "@/components/admin/empty-state";
import { ResearchGroup } from "@/components/admin/research-group";

export const dynamic = "force-dynamic";

interface ArtifactGroup {
  projectId: string | null;
  title: string;
  artifacts: DbResearchArtifact[];
}

function groupArtifactsByProject(
  artifacts: DbResearchArtifact[],
  projectMap: Map<string, DbProject>,
): ArtifactGroup[] {
  const grouped = new Map<string | null, DbResearchArtifact[]>();

  for (const artifact of artifacts) {
    const key = artifact.project_id;
    const list = grouped.get(key);
    if (list) {
      list.push(artifact);
    } else {
      grouped.set(key, [artifact]);
    }
  }

  const groups: ArtifactGroup[] = [];
  let unassigned: ArtifactGroup | null = null;

  for (const [projectId, items] of grouped) {
    if (projectId === null) {
      unassigned = { projectId: null, title: "Unassigned", artifacts: items };
    } else {
      const project = projectMap.get(projectId);
      groups.push({
        projectId,
        title: project?.title ?? "Unknown Project",
        artifacts: items,
      });
    }
  }

  // Sort groups by most recent artifact (artifacts arrive pre-sorted created_at DESC from DB)
  groups.sort((a, b) => {
    const aLatest = a.artifacts[0]?.created_at ?? "";
    const bLatest = b.artifacts[0]?.created_at ?? "";
    return bLatest.localeCompare(aLatest);
  });

  // Unassigned always last
  if (unassigned) {
    groups.push(unassigned);
  }

  return groups;
}

export default async function AdminResearchPage() {
  const [artifacts, projects] = await Promise.all([
    fetchResearchArtifactsDb({ limit: 500 }),
    fetchProjectsDb(),
  ]);

  const projectMap = new Map<string, DbProject>();
  for (const p of projects) {
    projectMap.set(p.id, p);
  }

  const groups = groupArtifactsByProject(artifacts, projectMap);

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <FileSearch size={14} className="text-teal-500" />
            <span className="type-body-sm font-medium text-zinc-200">Research</span>
          </div>
          <span className="type-body-sm text-zinc-600">{artifacts.length} artifacts</span>
        </div>
      </Panel>

      {artifacts.length === 0 ? (
        <EmptyState icon={FileSearch} message="No research artifacts yet." />
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <ResearchGroup
              key={group.projectId ?? "unassigned"}
              title={group.title}
              count={group.artifacts.length}
              isUnassigned={group.projectId === null}
            >
              <div className="divide-y divide-zinc-800/20">
                {group.artifacts.map((artifact) => (
                  <Link
                    key={artifact.id}
                    href={`/admin/research/${artifact.id}`}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/40 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="type-body-sm font-medium text-zinc-200 group-hover:text-zinc-100 truncate">
                          {artifact.title}
                        </p>
                        <span className="type-badge text-zinc-500">{artifact.domain}</span>
                      </div>
                      {artifact.summary && (
                        <p className="type-body-sm text-zinc-500 mt-1 line-clamp-1">{artifact.summary}</p>
                      )}
                    </div>
                    <ChevronRight size={14} className="text-zinc-700 group-hover:text-zinc-400 transition-colors mt-1 shrink-0" />
                  </Link>
                ))}
              </div>
            </ResearchGroup>
          ))}
        </div>
      )}
    </div>
  );
}
