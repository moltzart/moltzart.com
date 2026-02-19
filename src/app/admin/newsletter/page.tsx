import { redirect } from "next/navigation";
import { getCurrentWeekMonday } from "@/lib/newsletter-weeks";

export default function AdminNewsletter() {
  redirect(`/admin/newsletter/${getCurrentWeekMonday()}`);
}
