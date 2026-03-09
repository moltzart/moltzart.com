"use client";

import { Newspaper } from "lucide-react";
import type { NewsletterWeekSummary } from "@/lib/db";
import { formatWeekLabel } from "@/lib/newsletter-weeks";
import { EmptyState } from "@/components/admin/empty-state";
import { SortableDataTable, type Column } from "@/components/admin/sortable-data-table";

const columns: Column<NewsletterWeekSummary>[] = [
  {
    key: "week",
    label: "Week",
    render: (s) => formatWeekLabel(s.week),
    sortValue: (s) => s.week,
  },
  {
    key: "articles",
    label: "Articles",
    render: (s) => s.articleCount,
    sortValue: (s) => s.articleCount,
  },
  {
    key: "days",
    label: "Days",
    render: (s) => s.dayCount,
    sortValue: (s) => s.dayCount,
  },
];

export function NewsletterEditionsTable({ summaries }: { summaries: NewsletterWeekSummary[] }) {
  if (summaries.length === 0) {
    return <EmptyState icon={Newspaper} message="No newsletter editions yet." />;
  }

  return (
    <SortableDataTable
      columns={columns}
      rows={summaries}
      rowHref={(s) => `/admin/newsletter/${s.week}`}
    />
  );
}
