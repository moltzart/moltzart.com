import { fetchDrafts } from "@/lib/github";
import { PageHeader } from "@/components/admin/page-header";
import { AllDraftsView } from "@/components/drafts-view";

export const dynamic = "force-dynamic";

export default async function AdminDrafts() {
  const { days } = await fetchDrafts();
  const allDrafts = days.flatMap((d) => d.drafts);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Drafts"
        subtitle={
          allDrafts.length > 0
            ? `${allDrafts.filter((d) => d.status === "pending").length} pending · ${allDrafts.filter((d) => d.status === "approved").length} approved · ${allDrafts.filter((d) => d.status === "posted").length} posted`
            : undefined
        }
      />
      <AllDraftsView drafts={allDrafts} />
    </div>
  );
}
