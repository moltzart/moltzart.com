export const laneColors: Record<string, { tag: string; bg: string }> = {
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

export const sourceColors: Record<string, string> = {
  "The Verge": "bg-purple-500/20 text-purple-400",
  "Hacker News": "bg-orange-500/20 text-orange-400",
  "TechCrunch": "bg-green-500/20 text-green-400",
  "Ars Technica": "bg-blue-500/20 text-blue-400",
  "Wired": "bg-red-500/20 text-red-400",
  "MIT Technology Review": "bg-cyan-500/20 text-cyan-400",
  "Bloomberg": "bg-violet-500/20 text-violet-400",
  "Reuters": "bg-sky-500/20 text-sky-400",
  "NYT": "bg-zinc-400/20 text-zinc-300",
  "Platformer": "bg-pink-500/20 text-pink-400",
  "Stratechery": "bg-amber-500/20 text-amber-400",
};

const tagBase = "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium shrink-0";

export function LaneTag({ lane }: { lane: string }) {
  const colors = laneColors[lane]?.tag || "bg-zinc-700/40 text-zinc-400";
  return (
    <span className={`${tagBase} uppercase tracking-wider ${colors}`}>
      {lane}
    </span>
  );
}

export function SourceTag({ source }: { source: string }) {
  const colors = sourceColors[source] || "bg-zinc-700/40 text-zinc-400";
  return (
    <span className={`${tagBase} ${colors}`}>
      {source}
    </span>
  );
}
