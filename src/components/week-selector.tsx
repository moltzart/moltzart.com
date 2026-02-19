"use client";

import { useRouter } from "next/navigation";
import { formatWeekLabel } from "@/lib/newsletter-weeks";

interface WeekSelectorProps {
  currentWeek: string;       // ISO Monday date, e.g. "2026-02-16"
  availableWeeks: string[];  // ISO Monday dates, sorted newest-first
}

export function WeekSelector({ currentWeek, availableWeeks }: WeekSelectorProps) {
  const router = useRouter();
  return (
    <select
      value={currentWeek}
      onChange={(e) => router.push(`/admin/newsletter/${e.target.value}`)}
      className="bg-transparent text-sm font-medium text-zinc-200 border-none outline-none cursor-pointer"
    >
      {availableWeeks.map((week) => (
        <option key={week} value={week} className="bg-zinc-900 text-zinc-200">
          {formatWeekLabel(week)}
        </option>
      ))}
    </select>
  );
}
