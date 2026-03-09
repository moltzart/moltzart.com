import { Badge } from "@/components/ui/badge";
import type { ProjectStatus, ProjectKind } from "@/lib/projects";
import { STATUS_META } from "@/lib/projects";

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

export const pillarColors: Record<string, string> = {
  "DESIGN + DEVELOPMENT": "bg-pink-500/20 text-pink-400",
  "TECH + INNOVATION": "bg-violet-500/20 text-violet-400",
  "WORK + MINDSET": "bg-amber-500/20 text-amber-400",
};

export function LaneTag({ lane }: { lane: string }) {
  return <Badge className={laneColors[lane]?.tag}>{lane}</Badge>;
}

export function SourceTag({ source }: { source: string }) {
  return <Badge className={sourceColors[source]}>{source}</Badge>;
}

export function PillarTag({ pillar }: { pillar: string }) {
  return <Badge className={pillarColors[pillar]}>{pillar}</Badge>;
}

export function StatusTag({ status }: { status: ProjectStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge className={`${meta.bg} ${meta.tone}`}>
      <Icon />
      {meta.label}
    </Badge>
  );
}

export function KindTag({ kind }: { kind: ProjectKind }) {
  return <Badge variant="outline">{kind}</Badge>;
}

export const domainColors: Record<string, string> = {
  product: "bg-cyan-500/20 text-cyan-400",
  marketing: "bg-amber-500/20 text-amber-400",
  ops: "bg-cyan-500/20 text-cyan-400",
  content: "bg-pink-500/20 text-pink-400",
  strategy: "bg-violet-500/20 text-violet-400",
};

export function DomainTag({ domain }: { domain: string }) {
  return <Badge className={domainColors[domain]}>{domain.toUpperCase()}</Badge>;
}
