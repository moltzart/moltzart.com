import { notFound } from "next/navigation";
import { fetchXDraftsWeek, fetchXDraftWeekStarts } from "@/lib/db";
import { getWeekBounds, formatWeekLabel } from "@/lib/newsletter-weeks";
import { PageHeader } from "@/components/admin/page-header";
import { WeekSelector } from "@/components/week-selector";
import { SocialTable } from "@/components/social-view";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ week: string }>;
}

export default async function SocialWeekPage({ params }: Props) {
  const { week } = await params;

  const parsed = new Date(week + "T12:00:00Z");
  if (isNaN(parsed.getTime()) || parsed.getUTCDay() !== 1) {
    notFound();
  }

  const { start, end } = getWeekBounds(week);
  const [days, availableWeeks] = await Promise.all([
    fetchXDraftsWeek(start, end),
    fetchXDraftWeekStarts(),
  ]);

  const drafts = days.flatMap((d) =>
    d.drafts.map((draft) => ({
      ...draft,
      dayLabel: d.label,
    }))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Social"
        breadcrumbs={[
          { label: "Social", href: "/admin/social/editions" },
          { label: formatWeekLabel(week) },
        ]}
      >
        <WeekSelector
          currentWeek={week}
          availableWeeks={availableWeeks}
          basePath="/admin/social"
        />
      </PageHeader>
      <SocialTable drafts={drafts} />
    </div>
  );
}
