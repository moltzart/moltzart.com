import { notFound } from "next/navigation";
import { fetchEngageWeek, fetchEngageWeekStarts } from "@/lib/db";
import { getWeekBounds, formatWeekLabel } from "@/lib/newsletter-weeks";
import { EngageView } from "@/components/engage-view";
import { WeekSelector } from "@/components/week-selector";
import { MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ week: string }>;
}

export default async function EngageWeekPage({ params }: Props) {
  const { week } = await params;

  const parsed = new Date(week + "T12:00:00Z");
  if (isNaN(parsed.getTime()) || parsed.getUTCDay() !== 1) {
    notFound();
  }

  const { start, end } = getWeekBounds(week);
  const [days, weekStarts] = await Promise.all([
    fetchEngageWeek(start, end),
    fetchEngageWeekStarts(),
  ]);

  const totalItems = days.reduce((sum, d) => sum + d.items.length, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageCircle size={14} className="text-teal-500" />
            {weekStarts.length > 0 ? (
              <WeekSelector currentWeek={week} availableWeeks={weekStarts} basePath="/admin/engage" />
            ) : (
              <span className="text-sm font-medium text-zinc-200">{formatWeekLabel(week)}</span>
            )}
          </div>
          <span className="text-xs text-zinc-600 font-mono">{totalItems} items</span>
        </div>
      </div>
      <EngageView days={days} />
    </div>
  );
}
