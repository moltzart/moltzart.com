import { fetchNewsletterWeekSummaries } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { NewsletterEditionsTable } from "@/components/newsletter-editions-table";

export const dynamic = "force-dynamic";

export default async function NewsletterEditionsPage() {
  const summaries = await fetchNewsletterWeekSummaries();

  return (
    <div className="space-y-6">
      <PageHeader title="Newsletter — All Weeks" />
      <NewsletterEditionsTable summaries={summaries} />
    </div>
  );
}
