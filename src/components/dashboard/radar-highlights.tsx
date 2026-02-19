import Link from "next/link";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/admin/empty-state";
import { Radar } from "lucide-react";
import type { DbRadarItem } from "@/lib/db";
import { Panel } from "@/components/admin/panel";

interface RadarHighlightsProps {
  date: string;
  items: DbRadarItem[];
}

export function RadarHighlights({ date, items }: RadarHighlightsProps) {
  return (
    <Panel className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/30">
        <div className="flex items-center gap-2">
          <Radar size={14} className="text-teal-500" />
          <span className="text-sm font-medium text-zinc-200">Today&apos;s Radar</span>
          {date !== "—" && <span className="text-xs text-zinc-600 font-mono">{date}</span>}
        </div>
        <Link
          href="/admin/radar"
          className="text-xs text-zinc-500 hover:text-teal-400 transition-colors flex items-center gap-1"
        >
          All scans <ArrowUpRight size={10} />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <EmptyState icon={Radar} message="No radar scan today" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-3 pb-1">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">
              {items.length} items
            </span>
          </div>
          <div className="divide-y divide-zinc-800/20">
            {items.slice(0, 5).map((item) => (
              <div key={item.id} className="px-4 py-2.5 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item.source_url ? (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-zinc-200 hover:text-zinc-100 transition-colors truncate flex items-center gap-1.5"
                      >
                        {item.title}
                        <ExternalLink size={10} className="text-zinc-600 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-sm text-zinc-200 truncate">{item.title}</span>
                    )}
                  </div>
                  {item.why_bullets?.[0] && (
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{item.why_bullets[0]}</p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className="border-zinc-700/50 text-zinc-500 bg-zinc-800/20 text-[10px] shrink-0"
                >
                  {item.lane}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
