import { fetchDrafts } from "@/lib/github";
import { DayDraftsView } from "@/components/drafts-view";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function DraftDay({
  params,
}: {
  params: Promise<{ dayslug: string }>;
}) {
  const { dayslug } = await params;
  const { days, sha } = await fetchDrafts();
  const day = days.find((d) => d.date === dayslug);

  if (!day) notFound();

  const pending = day.drafts.filter((d) => d.status === "pending").length;

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <Link
          href="/admin/drafts"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          &larr; All drafts
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-xl font-semibold tracking-tight">{day.label}</h1>
          {pending > 0 && (
            <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10">
              {pending} to review
            </Badge>
          )}
        </div>
      </div>
      <DayDraftsView drafts={day.drafts} />
    </div>
  );
}
