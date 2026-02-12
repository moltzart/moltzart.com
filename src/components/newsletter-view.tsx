"use client";

import type { NewsletterDigest } from "@/lib/github";
import { ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Week {
  id: string;
  label: string;
  digests: NewsletterDigest[];
}

function getWeekMonday(dateStr: string): Date {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function formatWeekLabel(monday: Date): string {
  return `Week of ${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function groupByWeek(digests: NewsletterDigest[]): Week[] {
  const weekMap = new Map<string, { monday: Date; digests: NewsletterDigest[] }>();

  for (const digest of digests) {
    const monday = getWeekMonday(digest.date);
    const key = monday.toISOString().split("T")[0];
    if (!weekMap.has(key)) {
      weekMap.set(key, { monday, digests: [] });
    }
    weekMap.get(key)!.digests.push(digest);
  }

  return Array.from(weekMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, { monday, digests }]) => ({
      id: key,
      label: formatWeekLabel(monday),
      digests: digests.sort((a, b) => b.date.localeCompare(a.date)),
    }));
}

export function NewsletterView({ digests }: { digests: NewsletterDigest[] }) {
  const weeks = groupByWeek(digests);

  if (weeks.length === 0) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-xl font-semibold tracking-tight mb-6">Newsletter</h1>
        <p className="text-sm text-zinc-500">No picks yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight mb-6">Newsletter</h1>
      <Tabs defaultValue={weeks[0].id}>
        <TabsList className="mb-6">
          {weeks.map((week) => (
            <TabsTrigger key={week.id} value={week.id}>
              {week.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {weeks.map((week) => (
          <TabsContent key={week.id} value={week.id}>
            <div className="space-y-8">
              {week.digests.map((digest) => (
                <div key={digest.date}>
                  <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3 px-1">
                    {digest.label}
                  </h2>
                  <div className="space-y-2">
                    {digest.articles.map((article, idx) => (
                      <a
                        key={idx}
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-4 py-3 rounded-lg hover:bg-zinc-800/40 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                              {article.title}
                            </p>
                            <p className="text-sm text-zinc-500 mt-0.5 leading-relaxed">
                              {article.description}
                            </p>
                            <p className="text-xs text-zinc-600 mt-1">{article.source}</p>
                          </div>
                          <ExternalLink
                            size={14}
                            className="text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0 mt-1"
                          />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
