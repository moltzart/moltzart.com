// src/app/admin/newsletter/[week]/page.tsx
import { notFound } from "next/navigation";
import { fetchNewsletterWeek, fetchNewsletterWeekStarts } from "@/lib/db";
import { getWeekBounds, formatWeekLabel } from "@/lib/newsletter-weeks";
import { NewsletterView } from "@/components/newsletter-view";
import { WeekSelector } from "@/components/week-selector";
import { Newspaper } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ week: string }>;
}

export default async function NewsletterWeekPage({ params }: Props) {
  const { week } = await params;

  // Validate: must be a valid date that is a Monday (getUTCDay() === 1)
  const parsed = new Date(week + "T12:00:00Z");
  if (isNaN(parsed.getTime()) || parsed.getUTCDay() !== 1) {
    notFound();
  }

  const { start, end } = getWeekBounds(week);
  const [digests, weekStarts] = await Promise.all([
    fetchNewsletterWeek(start, end),
    fetchNewsletterWeekStarts(),
  ]);

  const totalArticles = digests.reduce((sum, d) => sum + d.articles.length, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Newspaper size={14} className="text-teal-500" />
            {weekStarts.length > 0 ? (
              <WeekSelector currentWeek={week} availableWeeks={weekStarts} />
            ) : (
              <span className="text-sm font-medium text-zinc-200">{formatWeekLabel(week)}</span>
            )}
          </div>
          <span className="text-xs text-zinc-600 font-mono">{totalArticles} articles</span>
        </div>
      </div>
      <NewsletterView digests={digests} />
    </div>
  );
}
