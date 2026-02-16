import { fetchEngageDates, fetchEngageItemsByDate } from "@/lib/db";
import { EngageView } from "@/components/engage-view";

export const dynamic = "force-dynamic";

export default async function AdminEngage() {
  const dates = await fetchEngageDates();
  const today = dates[0] || new Date().toISOString().split("T")[0];
  const initialItems = dates.length > 0 ? await fetchEngageItemsByDate(today) : [];

  return <EngageView dates={dates} initialItems={initialItems} initialDate={today} />;
}
