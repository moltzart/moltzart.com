import { redirect } from "next/navigation";
import { getCurrentWeekMonday } from "@/lib/newsletter-weeks";

export default function AdminEngage() {
  redirect(`/admin/engage/${getCurrentWeekMonday()}`);
}
