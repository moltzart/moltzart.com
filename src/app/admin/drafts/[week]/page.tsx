import { notFound } from "next/navigation";
import { fetchXDraftsWeek, fetchXDraftWeekStarts } from "@/lib/db";
import { getWeekBounds, formatWeekLabel } from "@/lib/newsletter-weeks";
import { DraftsView } from "@/components/drafts-view";
import { WeekSelector } from "@/components/week-selector";
import { PenLine } from "lucide-react";
import { Panel } from "@/components/admin/panel";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ week: string }>;
}

export default async function DraftsWeekPage({ params }: Props) {
  const { week } = await params;

  const parsed = new Date(week + "T12:00:00Z");
  if (isNaN(parsed.getTime()) || parsed.getUTCDay() !== 1) {
    notFound();
  }

  const { start, end } = getWeekBounds(week);
  const [days, weekStarts] = await Promise.all([
    fetchXDraftsWeek(start, end),
    fetchXDraftWeekStarts(),
  ]);

  const totalDrafts = days.reduce((sum, d) => sum + d.drafts.length, 0);

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <PenLine size={14} className="text-teal-500" />
            {weekStarts.length > 0 ? (
              <WeekSelector currentWeek={week} availableWeeks={weekStarts} basePath="/admin/drafts" />
            ) : (
              <span className="type-body-sm font-medium text-zinc-200">{formatWeekLabel(week)}</span>
            )}
          </div>
          <span className="type-body-sm text-zinc-600">{totalDrafts} drafts</span>
        </div>
      </Panel>
      <DraftsView days={days} />
    </div>
  );
}
