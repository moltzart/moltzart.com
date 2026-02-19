import { notFound } from "next/navigation";
import { fetchRadarWeek, fetchRadarWeekStarts } from "@/lib/db";
import { getWeekBounds, formatWeekLabel } from "@/lib/newsletter-weeks";
import { RadarWeekView } from "@/components/radar-week-view";
import { WeekSelector } from "@/components/week-selector";
import { Radar as RadarIcon } from "lucide-react";
import { Panel } from "@/components/admin/panel";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ week: string }>;
}

export default async function RadarWeekPage({ params }: Props) {
  const { week } = await params;

  const parsed = new Date(week + "T12:00:00Z");
  if (isNaN(parsed.getTime()) || parsed.getUTCDay() !== 1) {
    notFound();
  }

  const { start, end } = getWeekBounds(week);
  const [days, weekStarts] = await Promise.all([
    fetchRadarWeek(start, end),
    fetchRadarWeekStarts(),
  ]);

  const totalItems = days.reduce((sum, d) => sum + d.sections.reduce((s2, s) => s2 + s.items.length, 0), 0);

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <RadarIcon size={14} className="text-teal-500" />
            {weekStarts.length > 0 ? (
              <WeekSelector currentWeek={week} availableWeeks={weekStarts} basePath="/admin/radar" />
            ) : (
              <span className="text-sm font-medium text-zinc-200">{formatWeekLabel(week)}</span>
            )}
          </div>
          <span className="text-xs text-zinc-600 font-mono">{totalItems} items</span>
        </div>
      </Panel>
      <RadarWeekView days={days} />
    </div>
  );
}
