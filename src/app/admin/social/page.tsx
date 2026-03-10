import { redirect } from "next/navigation";
import { getWeekMonday } from "@/lib/newsletter-weeks";

export const dynamic = "force-dynamic";

export default function AdminSocialPage() {
  const today = new Date().toISOString().slice(0, 10);
  const currentMonday = getWeekMonday(today);
  redirect(`/admin/social/${currentMonday}`);
}
