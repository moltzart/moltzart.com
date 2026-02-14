"use client";

import type { RadarDay } from "@/lib/github";
import { ExternalLink, Radar as RadarIcon, ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const laneColors: Record<string, { tag: string; bg: string }> = {
  HN: { tag: "bg-orange-500/20 text-orange-400", bg: "bg-orange-500/5" },
  Design: { tag: "bg-pink-500/20 text-pink-400", bg: "bg-pink-500/5" },
  CSS: { tag: "bg-blue-500/20 text-blue-400", bg: "bg-blue-500/5" },
  "AI/Tech": { tag: "bg-purple-500/20 text-purple-400", bg: "bg-purple-500/5" },
  UX: { tag: "bg-green-500/20 text-green-400", bg: "bg-green-500/5" },
  AI: { tag: "bg-violet-500/20 text-violet-400", bg: "bg-violet-500/5" },
  Tech: { tag: "bg-cyan-500/20 text-cyan-400", bg: "bg-cyan-500/5" },
  Reddit: { tag: "bg-red-500/20 text-red-400", bg: "bg-red-500/5" },
  X: { tag: "bg-sky-500/20 text-sky-400", bg: "bg-sky-500/5" },
};

function LaneTag({ lane }: { lane: string }) {
  const colors = laneColors[lane]?.tag || "bg-zinc-700/40 text-zinc-400";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${colors}`}>
      {lane}
    </span>
  );
}

interface Props {
  dates: string[];
  initialData: RadarDay | null;
  initialDate: string;
}

export function RadarView({ dates, initialData, initialDate }: Props) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [data, setData] = useState<RadarDay | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [activeLanes, setActiveLanes] = useState<string[]>([]);
  const [clustersOpen, setClustersOpen] = useState(false);

  // Show last 7 dates as pills
  const visibleDates = dates.slice(0, 7);

  async function navigate(date: string) {
    setCurrentDate(date);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/radar?date=${date}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    }
    setLoading(false);
  }

  // Collect unique lanes from current data
  const allLanes = useMemo(() => {
    if (!data) return [];
    const lanes = new Set<string>();
    for (const section of data.sections) {
      for (const item of section.items) {
        lanes.add(item.lane);
      }
    }
    return Array.from(lanes).sort();
  }, [data]);

  // Filter sections by active lanes
  const filteredSections = useMemo(() => {
    if (!data) return [];
    if (activeLanes.length === 0) return data.sections;
    return data.sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => activeLanes.includes(item.lane)),
      }))
      .filter((section) => section.items.length > 0);
  }, [data, activeLanes]);

  const totalItems = filteredSections.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Radar"
        subtitle={data ? `${data.label} · ${totalItems} items` : undefined}
      />

      {/* Date strip */}
      <div className="flex gap-2 flex-wrap mb-4">
        {visibleDates.map((d) => {
          const label = d.slice(5); // MM-DD
          const active = d === currentDate;
          return (
            <button
              key={d}
              onClick={() => navigate(d)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                active
                  ? "bg-zinc-800 text-zinc-200 border border-zinc-700"
                  : "bg-zinc-900/30 text-zinc-500 border border-zinc-800/50 hover:text-zinc-300 hover:border-zinc-700"
              }`}
            >
              {label}
            </button>
          );
        })}
        {dates.length > 7 && (
          <select
            value={currentDate}
            onChange={(e) => navigate(e.target.value)}
            className="text-xs font-mono bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1.5 text-zinc-500"
          >
            {dates.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
      </div>

      {/* Lane filter toggle group */}
      {allLanes.length > 0 && (
        <div className="mb-4">
          <ToggleGroup
            type="multiple"
            value={activeLanes}
            onValueChange={setActiveLanes}
            className="flex-wrap justify-start gap-1.5"
          >
            {allLanes.map((lane) => {
              const colors = laneColors[lane]?.tag || "bg-zinc-700/40 text-zinc-400";
              return (
                <ToggleGroupItem
                  key={lane}
                  value={lane}
                  className={`text-[10px] font-medium uppercase tracking-wider px-2.5 py-1 rounded-md border border-zinc-800/50 data-[state=on]:${colors.split(" ")[0]} data-[state=on]:border-current/20`}
                >
                  {lane}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </div>
      )}

      {/* Topic clusters (collapsible, at top) */}
      {data?.clusters && data.clusters.length > 0 && (
        <div className="mb-6 border border-zinc-800/30 rounded-lg bg-zinc-900/20">
          <button
            onClick={() => setClustersOpen(!clustersOpen)}
            className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-zinc-800/20 transition-colors rounded-lg"
          >
            {clustersOpen ? (
              <ChevronDown size={12} className="text-zinc-600" />
            ) : (
              <ChevronRight size={12} className="text-zinc-600" />
            )}
            <span className="text-xs font-medium text-zinc-500 flex-1 text-left">
              Topic Clusters
            </span>
            <span className="text-xs font-mono text-zinc-600">{data.clusters.length}</span>
          </button>
          {clustersOpen && (
            <div className="px-4 pb-3 border-t border-zinc-800/20">
              <div className="flex flex-wrap gap-2 pt-2">
                {data.clusters.map((cluster, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  >
                    {cluster}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : !data || filteredSections.length === 0 ? (
        <EmptyState icon={RadarIcon} message={activeLanes.length > 0 ? "No items match the selected lanes." : "No radar data for this date."} />
      ) : (
        <div className="space-y-8">
          {filteredSections.map((section) => (
            <div key={section.heading}>
              <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3 px-1">
                {section.heading}
              </h2>
              <div className="space-y-1">
                {section.items.map((item, idx) => {
                  const laneBg = laneColors[item.lane]?.bg || "";
                  return (
                    <div
                      key={idx}
                      className={`px-4 py-3 rounded-lg hover:bg-zinc-800/40 transition-colors group ${laneBg}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <LaneTag lane={item.lane} />
                            {item.link ? (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 transition-colors hover:underline"
                              >
                                {item.title}
                              </a>
                            ) : (
                              <span className="text-sm font-medium text-zinc-200">
                                {item.title}
                              </span>
                            )}
                            {item.link && (
                              <a href={item.link} target="_blank" rel="noopener noreferrer">
                                <ExternalLink
                                  size={12}
                                  className="text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0"
                                />
                              </a>
                            )}
                          </div>
                          {item.note.includes("\n") ? (
                            <ul className="text-sm text-zinc-500 leading-relaxed space-y-0.5 mt-1">
                              {item.note.split("\n").map((bullet, bIdx) => (
                                <li key={bIdx} className="flex gap-2">
                                  <span className="text-zinc-700 shrink-0">·</span>
                                  <span>{bullet}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-zinc-500 leading-relaxed">
                              {item.note}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
