"use client";

import { useMemo, useState } from "react";
import type { RadarWeekDay, RadarItem } from "@/lib/db";
import { ChevronDown, ChevronRight, ExternalLink, Radar as RadarIcon, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/admin/empty-state";
import { Panel } from "@/components/admin/panel";
import { LaneTag, laneColors } from "@/components/admin/tag-badge";

export function RadarWeekView({ days: initialDays }: { days: RadarWeekDay[] }) {
  const [days, setDays] = useState(initialDays);
  const [openDates, setOpenDates] = useState<Set<string>>(
    () => new Set(initialDays.length > 0 ? [initialDays[0].date] : [])
  );
  const [activeLanes, setActiveLanes] = useState<string[]>([]);

  // Collect all unique lanes across the whole week
  const allLanes = useMemo(() => {
    const lanes = new Set<string>();
    for (const day of days) {
      for (const section of day.sections) {
        for (const item of section.items) {
          lanes.add(item.lane);
        }
      }
    }
    return Array.from(lanes).sort();
  }, [days]);

  // Apply lane filter: returns filtered sections, filtering out empty ones
  function filterSections(sections: RadarWeekDay["sections"]) {
    if (activeLanes.length === 0) return sections;
    return sections
      .map((s) => ({ ...s, items: s.items.filter((i) => activeLanes.includes(i.lane)) }))
      .filter((s) => s.items.length > 0);
  }

  // Visible days after filtering (hide days with zero items)
  const visibleDays = useMemo(() => {
    return days.map((d) => ({ ...d, sections: filterSections(d.sections) })).filter((d) => d.sections.length > 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, activeLanes]);

  if (days.length === 0) {
    return <EmptyState icon={RadarIcon} message="No radar items this week." />;
  }

  function toggleDay(date: string) {
    setOpenDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  function toggleLane(lane: string) {
    setActiveLanes((prev) =>
      prev.includes(lane) ? prev.filter((l) => l !== lane) : [...prev, lane]
    );
  }

  async function deleteItem(dayDate: string, itemId: string) {
    setDays((prev) =>
      prev
        .map((d) =>
          d.date === dayDate
            ? {
                ...d,
                sections: d.sections
                  .map((s) => ({ ...s, items: s.items.filter((i) => i.id !== itemId) }))
                  .filter((s) => s.items.length > 0),
              }
            : d
        )
        .filter((d) => d.sections.length > 0)
    );
    await fetch(`/api/admin/radar/${itemId}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-3">
      {/* Lane filter */}
      {allLanes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allLanes.map((lane) => {
            const isActive = activeLanes.includes(lane);
            const colors = laneColors[lane]?.tag || "bg-zinc-700/40 text-zinc-400";
            return (
              <button
                key={lane}
                onClick={() => toggleLane(lane)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider border transition-colors ${
                  isActive
                    ? `${colors} border-current/20`
                    : "text-zinc-600 border-zinc-800/50 hover:text-zinc-400"
                }`}
              >
                {lane}
              </button>
            );
          })}
        </div>
      )}

      {/* Days */}
      {visibleDays.length === 0 ? (
        <EmptyState icon={RadarIcon} message="No items match the selected lanes." />
      ) : (
        visibleDays.map((day) => {
          const isOpen = openDates.has(day.date);
          const totalItems = day.sections.reduce((sum, s) => sum + s.items.length, 0);
          return (
            <Panel key={day.date} className="flex flex-col">
              <button
                onClick={() => toggleDay(day.date)}
                className="flex items-center justify-between px-4 py-3 w-full text-left hover:bg-zinc-800/20 transition-colors rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <RadarIcon size={14} className="text-teal-500" />
                  <span className="text-sm font-medium text-zinc-200">{day.label}</span>
                  <span className="text-xs text-zinc-600 font-mono">{totalItems} items</span>
                </div>
                {isOpen
                  ? <ChevronDown size={14} className="text-zinc-600" />
                  : <ChevronRight size={14} className="text-zinc-600" />
                }
              </button>

              {isOpen && (
                <div className="border-t border-zinc-800/30">
                  {day.sections.map((section, sIdx) => (
                    <div key={section.heading}>
                      <div className={`px-4 py-2 ${sIdx > 0 ? "border-t border-zinc-800/30" : ""}`}>
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">
                          {section.heading} · {section.items.length}
                        </span>
                      </div>
                      <div className="divide-y divide-zinc-800/20">
                        {section.items.map((item: RadarItem) => {
                          const laneBg = laneColors[item.lane]?.bg || "";
                          return (
                            <div
                              key={item.id}
                              className={`px-4 py-3 hover:bg-zinc-800/40 transition-colors group ${laneBg}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="mb-1">
                                    <LaneTag lane={item.lane} />
                                    <div className="flex items-center gap-1.5 mt-1">
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
                                        <span className="text-sm font-medium text-zinc-200">{item.title}</span>
                                      )}
                                      {item.link && (
                                        <a href={item.link} target="_blank" rel="noopener noreferrer">
                                          <ExternalLink size={12} className="text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                  {item.note && (
                                    item.note.includes("\n") ? (
                                      <ul className="text-sm text-zinc-500 leading-relaxed space-y-0.5 mt-1">
                                        {item.note.split("\n").map((bullet, bIdx) => (
                                          <li key={bIdx} className="flex gap-2">
                                            <span className="text-zinc-700 shrink-0">·</span>
                                            <span>{bullet}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-sm text-zinc-500 leading-relaxed">{item.note}</p>
                                    )
                                  )}
                                </div>
                                <button
                                  onClick={() => deleteItem(day.date, item.id)}
                                  className="text-zinc-700 hover:text-red-400 transition-colors p-0.5 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5"
                                  title="Delete item"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          );
        })
      )}
    </div>
  );
}
