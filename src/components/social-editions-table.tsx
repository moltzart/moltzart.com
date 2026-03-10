"use client";

import { MessageSquare } from "lucide-react";
import type { DraftWeekSummary } from "@/lib/db";
import { formatWeekLabel } from "@/lib/newsletter-weeks";
import { EmptyState } from "@/components/admin/empty-state";
import { SortableDataTable, type Column } from "@/components/admin/sortable-data-table";

const columns: Column<DraftWeekSummary>[] = [
  {
    key: "week",
    label: "Week",
    render: (s) => formatWeekLabel(s.week),
    sortValue: (s) => s.week,
  },
  {
    key: "drafts",
    label: "Drafts",
    render: (s) => s.draftCount,
    sortValue: (s) => s.draftCount,
  },
  {
    key: "posted",
    label: "Posted",
    render: (s) => `${s.postedCount}/${s.draftCount}`,
    sortValue: (s) => s.postedCount,
  },
  {
    key: "days",
    label: "Days",
    render: (s) => s.dayCount,
    sortValue: (s) => s.dayCount,
  },
];

export function SocialEditionsTable({ summaries }: { summaries: DraftWeekSummary[] }) {
  if (summaries.length === 0) {
    return <EmptyState icon={MessageSquare} message="No social editions yet." />;
  }

  return (
    <SortableDataTable
      columns={columns}
      rows={summaries}
      rowHref={(s) => `/admin/social/${s.week}`}
    />
  );
}
