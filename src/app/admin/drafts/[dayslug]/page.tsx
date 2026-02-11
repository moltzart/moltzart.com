import { fetchDrafts } from "@/lib/github";
import { DraftsView } from "@/components/drafts-view";
import { notFound } from "next/navigation";
import Link from "next/link";

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
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/drafts"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Drafts
        </Link>
        <span className="text-zinc-700">/</span>
        <h1 className="text-xl font-semibold tracking-tight">{day.label}</h1>
        {pending > 0 && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-medium">
            {pending} to review
          </span>
        )}
      </div>
      <DraftsView days={[day]} sha={sha} />
    </div>
  );
}
