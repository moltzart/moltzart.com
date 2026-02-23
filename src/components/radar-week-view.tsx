"use client";

import { useState } from "react";
import type { RadarWeekDay, RadarItem } from "@/lib/db";
import type { LucideIcon } from "lucide-react";
import { BookOpen, ChevronDown, ChevronRight, ExternalLink, Flame, Github, Globe, MessageCircle, Newspaper, Radar as RadarIcon, Rss, TrendingUp, Trash2, Twitter } from "lucide-react";
import { EmptyState } from "@/components/admin/empty-state";
import { Panel } from "@/components/admin/panel";
import { LaneTag, laneColors } from "@/components/admin/tag-badge";

type SectionMeta = { icon: LucideIcon; iconClass: string; borderClass: string };

const SECTION_META: Record<string, SectionMeta> = {
  "Hacker News":       { icon: Flame,         iconClass: "text-orange-400", borderClass: "border-orange-500/60" },
  "Reddit":            { icon: MessageCircle,  iconClass: "text-rose-400",   borderClass: "border-rose-500/60"   },
  "Blogs":             { icon: BookOpen,       iconClass: "text-cyan-400",   borderClass: "border-cyan-500/60"   },
  "GitHub Trending":   { icon: Github,         iconClass: "text-purple-400", borderClass: "border-purple-500/60" },
  "X Timeline":        { icon: Twitter,        iconClass: "text-sky-400",    borderClass: "border-sky-500/60"    },
  "Changelog Nightly": { icon: Rss,            iconClass: "text-emerald-400",borderClass: "border-emerald-500/60"},
  "Product Hunt Weekly":{ icon: TrendingUp,    iconClass: "text-amber-400",  borderClass: "border-amber-500/60"  },
};
const DEFAULT_META: SectionMeta = { icon: Globe, iconClass: "text-zinc-400", borderClass: "border-zinc-600/60" };

export function RadarWeekView({ days: initialDays }: { days: RadarWeekDay[] }) {
  const [days, setDays] = useState(initialDays);
  const [openDates, setOpenDates] = useState<Set<string>>(
    () => new Set(initialDays.length > 0 ? [initialDays[0].date] : [])
  );
  const visibleDays = days;

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
      {visibleDays.length === 0 ? (
        <EmptyState icon={RadarIcon} message="No radar items this week." />
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
                  {day.sections.map((section, sIdx) => {
                    const meta = SECTION_META[section.heading] ?? DEFAULT_META;
                    const SectionIcon = meta.icon;
                    return (
                    <div key={section.heading}>
                      <div className={`px-4 py-3 bg-zinc-800/50 flex items-center justify-between border-l-4 ${meta.borderClass} ${sIdx > 0 ? "border-t border-zinc-800/50" : ""}`}>
                        <div className="flex items-center gap-2.5">
                          <SectionIcon size={16} className={meta.iconClass} />
                          <span className={`text-sm font-bold tracking-wide ${meta.iconClass}`}>
                            {section.heading}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500 font-mono bg-zinc-700/50 px-1.5 py-0.5 rounded">
                          {section.items.length}
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
                    );
                  })}
                </div>
              )}
            </Panel>
          );
        })
      )}
    </div>
  );
}
