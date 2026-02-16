"use client";

import type { DbEngageItem } from "@/lib/db";
import { ExternalLink, MessageCircle, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/admin/empty-state";

interface Props {
  dates: string[];
  initialItems: DbEngageItem[];
  initialDate: string;
}

export function EngageView({ dates, initialItems, initialDate }: Props) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [items, setItems] = useState<DbEngageItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const visibleDates = dates.slice(0, 7);

  async function navigate(date: string) {
    setCurrentDate(date);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/engage?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    }
    setLoading(false);
  }

  return (
    <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/30">
        <div className="flex items-center gap-2">
          <MessageCircle size={14} className="text-teal-500" />
          <span className="text-sm font-medium text-zinc-200">Engage</span>
          {items.length > 0 && (
            <span className="text-xs text-zinc-600 font-mono">{items.length} items</span>
          )}
        </div>

        {/* Date strip */}
        <div className="flex gap-1.5 flex-wrap">
          {visibleDates.map((d) => {
            const label = d.slice(5);
            const active = d === currentDate;
            return (
              <button
                key={d}
                onClick={() => navigate(d)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                  active
                    ? "bg-teal-500/10 text-teal-400 border border-teal-500/30"
                    : "text-zinc-500 hover:text-zinc-300"
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
              className="text-xs font-mono bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-zinc-500"
            >
              {dates.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500 py-8 text-center">Loading...</p>
      ) : items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <EmptyState icon={MessageCircle} message="No reply targets for this date." />
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/20">
          {items.map((item) => (
            <div key={item.id} className="px-4 py-3 hover:bg-zinc-800/40 transition-colors group">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-bold mt-0.5">
                  {item.priority || "–"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {item.author && (
                      <span className="text-xs font-medium text-teal-400">{item.author}</span>
                    )}
                    {item.tweet_url && (
                      <a href={item.tweet_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">
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
                          <ArrowUpRight size={12} className="text-sky-500/60 shrink-0 mt-1" />
                          <span>{angle}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
