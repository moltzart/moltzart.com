"use client";

import { useState } from "react";
import type { EngageDay, DbEngageItem } from "@/lib/db";
import { ArrowUpRight, ChevronDown, ChevronRight, ExternalLink, MessageCircle, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/admin/empty-state";
import { Panel } from "@/components/admin/panel";

const PRIORITY_TIERS = [
  { max: 1, label: "Top Picks", accent: true },
  { max: 2, label: "Worth Engaging", accent: false },
  { max: Infinity, label: "Also Noted", accent: false },
] as const;

function groupByTier(items: DbEngageItem[]) {
  const tiers: { label: string; accent: boolean; items: DbEngageItem[] }[] = [];
  for (const tier of PRIORITY_TIERS) {
    const already = tiers.flatMap((t) => t.items);
    const matched = items.filter((i) => i.priority <= tier.max && !already.includes(i));
    if (matched.length > 0) {
      tiers.push({ label: tier.label, accent: tier.accent, items: matched });
    }
  }
  return tiers;
}

export function EngageView({ days: initialDays }: { days: EngageDay[] }) {
  const [days, setDays] = useState(initialDays);
  const [openDates, setOpenDates] = useState<Set<string>>(
    () => new Set(initialDays.length > 0 ? [initialDays[0].date] : [])
  );

  if (days.length === 0) {
    return <EmptyState icon={MessageCircle} message="No reply targets this week." />;
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
            ? { ...d, items: d.items.filter((i) => i.id !== itemId) }
            : d
        )
        .filter((d) => d.items.length > 0)
    );
    await fetch(`/api/admin/engage/${itemId}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-2">
      {days.map((day) => {
        const isOpen = openDates.has(day.date);
        const tiers = groupByTier(day.items);
        return (
          <Panel key={day.date} className="flex flex-col">
            <button
              onClick={() => toggleDay(day.date)}
              className="flex items-center justify-between px-4 py-3 w-full text-left hover:bg-zinc-800/20 transition-colors rounded-lg"
            >
              <div className="flex items-center gap-2">
                <MessageCircle size={14} className="text-teal-500" />
                <span className="text-sm font-medium text-zinc-200">{day.label}</span>
                <span className="text-xs text-zinc-600 font-mono">{day.items.length} items</span>
              </div>
              {isOpen
                ? <ChevronDown size={14} className="text-zinc-600" />
                : <ChevronRight size={14} className="text-zinc-600" />
              }
            </button>

            {isOpen && (
              <div className="border-t border-zinc-800/30">
                {tiers.map((tier, tIdx) => (
                  <div key={tier.label}>
                    <div className={`px-4 py-2 ${tIdx > 0 ? "border-t border-zinc-800/30" : ""}`}>
                      <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">
                        {tier.label} · {tier.items.length}
                      </span>
                    </div>
                    <div className="divide-y divide-zinc-800/20">
                      {tier.items.map((item) => (
                        <div
                          key={item.id}
                          className={`px-4 py-3 hover:bg-zinc-800/40 transition-colors group ${
                            tier.accent ? "border-l-2 border-l-teal-500/40" : ""
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {item.author && (
                                  <span className="text-xs font-medium text-teal-400">{item.author}</span>
                                )}
                                {item.tweet_url && (
                                  <a
                                    href={item.tweet_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
                                  >
                                    <ExternalLink size={10} />
                                    <span>tweet</span>
                                  </a>
                                )}
                              </div>
                              <p className="text-sm text-zinc-200 leading-relaxed mb-1">{item.title}</p>
                              {item.context && (
                                <p className="text-sm text-zinc-500 leading-relaxed mb-2">{item.context}</p>
                              )}
                              {item.suggested_angles && item.suggested_angles.length > 0 && (
                                <ul className="space-y-0.5">
                                  {item.suggested_angles.map((angle, aIdx) => (
                                    <li key={aIdx} className="flex gap-2 text-sm text-zinc-400">
                                      <ArrowUpRight size={12} className="text-teal-500/50 shrink-0 mt-1" />
                                      <span>{angle}</span>
                                    </li>
                                  ))}
                                </ul>
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
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        );
      })}
    </div>
  );
}
