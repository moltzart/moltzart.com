import { ExternalLink, FileSearch } from "lucide-react";
import type { DbProductResearchItem } from "@/lib/db";
import { Panel } from "@/components/admin/panel";
import { EmptyState } from "@/components/admin/empty-state";

function formatDate(input: string): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ProductResearchView({ research }: { research: DbProductResearchItem[] }) {
  if (research.length === 0) {
    return <EmptyState icon={FileSearch} message="No research attached yet." />;
  }

  return (
    <Panel className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/30">
        <div className="flex items-center gap-2">
          <FileSearch size={14} className="text-teal-500" />
          <span className="text-sm font-medium text-zinc-200">Research</span>
        </div>
        <span className="text-xs text-zinc-600 font-mono">{research.length} items</span>
      </div>

      <div className="divide-y divide-zinc-800/20">
        {research.map((item) => (
          <div key={item.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {item.source_type.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-zinc-600 font-mono">{formatDate(item.created_at)}</span>
                </div>
              </div>
              {item.source_url && (
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-teal-500 hover:text-teal-400 transition-colors shrink-0"
                >
                  <ExternalLink size={12} />
                  <span>Source</span>
                </a>
              )}
            </div>
            {item.notes && (
              <p className="text-sm text-zinc-500 leading-relaxed mt-2 whitespace-pre-wrap">
                {item.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}
