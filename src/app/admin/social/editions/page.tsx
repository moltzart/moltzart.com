import { fetchXDraftWeekSummaries } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { SocialEditionsTable } from "@/components/social-editions-table";

export const dynamic = "force-dynamic";

export default async function SocialEditionsPage() {
  const summaries = await fetchXDraftWeekSummaries();

  return (
    <div className="space-y-6">
      <PageHeader title="Social — All Weeks" />
      <SocialEditionsTable summaries={summaries} />
    </div>
  );
}
