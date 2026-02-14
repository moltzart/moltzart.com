"use client";

import type { RadarDay } from "@/lib/github";
import { ExternalLink, ChevronLeft, ChevronRight, Radar as RadarIcon } from "lucide-react";
import { useState } from "react";

const laneColors: Record<string, string> = {
  HN: "bg-orange-500/20 text-orange-400",
  Design: "bg-pink-500/20 text-pink-400",
  CSS: "bg-blue-500/20 text-blue-400",
  "AI/Tech": "bg-purple-500/20 text-purple-400",
  UX: "bg-green-500/20 text-green-400",
  AI: "bg-violet-500/20 text-violet-400",
  Tech: "bg-cyan-500/20 text-cyan-400",
  Reddit: "bg-red-500/20 text-red-400",
  X: "bg-sky-500/20 text-sky-400",
};

function LaneTag({ lane }: { lane: string }) {
  const colors = laneColors[lane] || "bg-zinc-700/40 text-zinc-400";
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

  const currentIdx = dates.indexOf(currentDate);
  const hasPrev = currentIdx < dates.length - 1;
  const hasNext = currentIdx > 0;

  async function navigate(date: string) {
    setCurrentDate(date);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/radar?date=${date}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    }
    setLoading(false);
  }

  const totalItems = data?.sections.reduce((sum, s) => sum + s.items.length, 0) ?? 0;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Radar</h1>
          {data && (
            <p className="text-sm text-zinc-500 mt-1">
              {data.label} &middot; {totalItems} items
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => hasPrev && navigate(dates[currentIdx + 1])}
            disabled={!hasPrev}
            className="p-1.5 rounded-md hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <select
            value={currentDate}
            onChange={(e) => navigate(e.target.value)}
            className="text-sm bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-zinc-300"
          >
            {dates.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <button
            onClick={() => hasNext && navigate(dates[currentIdx - 1])}
            disabled={!hasNext}
            className="p-1.5 rounded-md hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : !data || data.sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
          <RadarIcon size={32} className="mb-3 opacity-50" />
          <p className="text-sm">No radar data for this date.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {data.sections.map((section) => (
            <div key={section.heading}>
              <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3 px-1">
                {section.heading}
              </h2>
              <div className="space-y-1">
                {section.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-3 rounded-lg hover:bg-zinc-800/40 transition-colors group"
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
                ))}
              </div>
            </div>
          ))}

          {data.clusters && data.clusters.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3 px-1">
                Topic Clusters
              </h2>
              <div className="flex flex-wrap gap-2 px-1">
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
    </div>
  );
}
