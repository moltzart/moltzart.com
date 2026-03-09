"use client";

import { useRouter } from "next/navigation";
import { formatWeekLabel } from "@/lib/newsletter-weeks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WeekSelectorProps {
  currentWeek: string;       // ISO Monday date, e.g. "2026-02-16"
  availableWeeks: string[];  // ISO Monday dates, sorted newest-first
  basePath: string;          // e.g. "/admin/newsletter" or "/admin/engage"
}

export function WeekSelector({ currentWeek, availableWeeks, basePath }: WeekSelectorProps) {
  const router = useRouter();
  return (
    <Select value={currentWeek} onValueChange={(v) => router.push(`${basePath}/${v}`)}>
      <SelectTrigger size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {availableWeeks.map((week) => (
          <SelectItem key={week} value={week}>
            {formatWeekLabel(week)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
