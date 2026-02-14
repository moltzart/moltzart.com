import { fetchRadarDates, fetchRadarDay } from "@/lib/github";
import { RadarView } from "@/components/radar-view";

export const dynamic = "force-dynamic";

export default async function AdminRadar() {
  const dates = await fetchRadarDates();
  const today = dates[0] || new Date().toISOString().split("T")[0];
  const initialData = dates.length > 0 ? await fetchRadarDay(today) : null;

  return <RadarView dates={dates} initialData={initialData} initialDate={today} />;
}
