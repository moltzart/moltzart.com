# Radar Week View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply the newsletter/engage week-view pattern to `/admin/radar` — week slug routing, collapsible days, global lane filter, delete buttons.

**Architecture:** Add `[week]` dynamic route mirroring engage. Two new DB functions group radar items by day within a week. `RadarView` (client component with date pills) is replaced by `RadarWeekView` (collapsible days + lane filter). `/admin/radar` redirects to current week.

**Tech Stack:** Next.js 15 App Router, TypeScript, Neon Postgres (`@neondatabase/serverless`), Tailwind CSS v4, Lucide React.

---

### Task 1: Add `id` to `RadarItem` and new DB functions

**Files:**
- Modify: `src/lib/db.ts`

**Context:** `RadarItem` currently lacks `id` — needed for delete. `fetchRadarWeek` groups items by day, mirroring `fetchEngageWeek`. `fetchRadarWeekStarts` mirrors `fetchEngageWeekStarts`.

**Step 1: Add `id` to `RadarItem` interface**

Find the `RadarItem` interface (around line 359) and add `id`:

```ts
export interface RadarItem {
  id: string;          // add this line
  title: string;
  source: string;
  link: string;
  lane: string;
  note: string;
  angle?: string;
}
```

**Step 2: Update `fetchRadarDay` to include `id`**

Find the `sectionMap.get(item.section)!.push({` block inside `fetchRadarDay` and add `id: item.id`:

```ts
sectionMap.get(item.section)!.push({
  id: item.id,         // add this line
  title: item.title,
  source: item.source_name || item.section,
  link: item.source_url || "",
  lane: item.lane,
  note: (item.why_bullets || []).join("\n"),
});
```

**Step 3: Add `RadarWeekDay` type and three new functions**

Add after the closing brace of `fetchRadarDay` (around line 412), before the `// --- Shared helpers ---` comment:

```ts
export interface RadarWeekDay {
  date: string;
  label: string;
  sections: { heading: string; items: RadarItem[] }[];
}

export async function fetchRadarWeek(start: string, end: string): Promise<RadarWeekDay[]> {
  const rows = await sql()`
    SELECT * FROM radar_items
    WHERE date BETWEEN ${start} AND ${end}
    ORDER BY date DESC, section, created_at
  `;
  if (rows.length === 0) return [];

  const byDate = new Map<string, Map<string, RadarItem[]>>();
  for (const r of rows) {
    const date = toDateStr(r.date);
    if (!byDate.has(date)) byDate.set(date, new Map());
    const sectionMap = byDate.get(date)!;
    if (!sectionMap.has(r.section)) sectionMap.set(r.section, []);
    sectionMap.get(r.section)!.push({
      id: r.id as string,
      title: r.title as string,
      source: (r.source_name as string) || (r.section as string),
      link: (r.source_url as string) || "",
      lane: r.lane as string,
      note: ((r.why_bullets as string[]) || []).join("\n"),
    });
  }

  const days: RadarWeekDay[] = [];
  for (const [date, sectionMap] of byDate) {
    const sections = Array.from(sectionMap.entries()).map(([heading, items]) => ({ heading, items }));
    days.push({ date, label: formatDayLabel(date), sections });
  }
  return days;
}

export async function fetchRadarWeekStarts(): Promise<string[]> {
  const rows = await sql()`SELECT DISTINCT date FROM radar_items ORDER BY date DESC`;
  const seen = new Set<string>();
  for (const r of rows) {
    seen.add(getWeekMonday(toDateStr(r.date)));
  }
  return [...seen].sort().reverse();
}

export async function deleteRadarItem(id: string): Promise<void> {
  await sql()`DELETE FROM radar_items WHERE id = ${id}`;
}
```

**Step 4: Verify build**

```bash
npm run build
```

Expected: no TypeScript errors. If `RadarView` still references old `RadarItem` without `id` that's fine — we're adding a field, not removing one.

**Step 5: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat: add RadarWeekDay type + fetchRadarWeek/fetchRadarWeekStarts/deleteRadarItem"
```

---

### Task 2: Add DELETE API route for radar items

**Files:**
- Create: `src/app/api/admin/radar/[id]/route.ts`

**Context:** Same pattern as `src/app/api/admin/engage/[id]/route.ts`.

**Step 1: Create the route file**

```ts
import { NextRequest, NextResponse } from "next/server";
import { deleteRadarItem } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteRadarItem(id);
  return NextResponse.json({ ok: true });
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: clean.

**Step 3: Commit**

```bash
git add src/app/api/admin/radar/[id]/route.ts
git commit -m "feat: add DELETE /api/admin/radar/[id] endpoint"
```

---

### Task 3: Create `RadarWeekView` component

**Files:**
- Create: `src/components/radar-week-view.tsx`

**Context:** Mirrors `EngageView` structure (collapsible days, optimistic delete) but adds radar-specific rendering: lane-colored sections, `why_bullets` note display, lane filter bar. The lane filter is a row of toggle buttons above the day list that hides non-matching items globally. Days with zero visible items are hidden automatically.

**Step 1: Create the component**

```tsx
"use client";

import { useMemo, useState } from "react";
import type { RadarWeekDay, RadarItem } from "@/lib/db";
import { ChevronDown, ChevronRight, ExternalLink, Radar as RadarIcon, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/admin/empty-state";

const laneColors: Record<string, { tag: string; bg: string }> = {
  HN: { tag: "bg-orange-500/20 text-orange-400", bg: "bg-orange-500/5" },
  Design: { tag: "bg-pink-500/20 text-pink-400", bg: "bg-pink-500/5" },
  CSS: { tag: "bg-blue-500/20 text-blue-400", bg: "bg-blue-500/5" },
  "AI/Tech": { tag: "bg-purple-500/20 text-purple-400", bg: "bg-purple-500/5" },
  UX: { tag: "bg-green-500/20 text-green-400", bg: "bg-green-500/5" },
  AI: { tag: "bg-violet-500/20 text-violet-400", bg: "bg-violet-500/5" },
  Tech: { tag: "bg-cyan-500/20 text-cyan-400", bg: "bg-cyan-500/5" },
  Reddit: { tag: "bg-red-500/20 text-red-400", bg: "bg-red-500/5" },
  X: { tag: "bg-sky-500/20 text-sky-400", bg: "bg-sky-500/5" },
};

function LaneTag({ lane }: { lane: string }) {
  const colors = laneColors[lane]?.tag || "bg-zinc-700/40 text-zinc-400";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${colors}`}>
      {lane}
    </span>
  );
}

export function RadarWeekView({ days: initialDays }: { days: RadarWeekDay[] }) {
  const [days, setDays] = useState(initialDays);
  const [openDates, setOpenDates] = useState<Set<string>>(
    () => new Set(initialDays.length > 0 ? [initialDays[0].date] : [])
  );
  const [activeLanes, setActiveLanes] = useState<string[]>([]);

  // Collect all unique lanes across the whole week
  const allLanes = useMemo(() => {
    const lanes = new Set<string>();
    for (const day of days) {
      for (const section of day.sections) {
        for (const item of section.items) {
          lanes.add(item.lane);
        }
      }
    }
    return Array.from(lanes).sort();
  }, [days]);

  // Apply lane filter: returns filtered sections, filtering out empty ones
  function filterSections(sections: RadarWeekDay["sections"]) {
    if (activeLanes.length === 0) return sections;
    return sections
      .map((s) => ({ ...s, items: s.items.filter((i) => activeLanes.includes(i.lane)) }))
      .filter((s) => s.items.length > 0);
  }

  // Visible days after filtering (hide days with zero items)
  const visibleDays = useMemo(() => {
    return days.map((d) => ({ ...d, sections: filterSections(d.sections) })).filter((d) => d.sections.length > 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, activeLanes]);

  if (days.length === 0) {
    return <EmptyState icon={RadarIcon} message="No radar items this week." />;
  }

  function toggleDay(date: string) {
    setOpenDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  function toggleLane(lane: string) {
    setActiveLanes((prev) =>
      prev.includes(lane) ? prev.filter((l) => l !== lane) : [...prev, lane]
    );
  }

  async function deleteItem(dayDate: string, itemId: string) {
    setDays((prev) =>
      prev
        .map((d) =>
          d.date === dayDate
            ? {
                ...d,
                sections: d.sections
                  .map((s) => ({ ...s, items: s.items.filter((i) => i.id !== itemId) }))
                  .filter((s) => s.items.length > 0),
              }
            : d
        )
        .filter((d) => d.sections.length > 0)
    );
    await fetch(`/api/admin/radar/${itemId}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-3">
      {/* Lane filter */}
      {allLanes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allLanes.map((lane) => {
            const isActive = activeLanes.includes(lane);
            const colors = laneColors[lane]?.tag || "bg-zinc-700/40 text-zinc-400";
            return (
              <button
                key={lane}
                onClick={() => toggleLane(lane)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider border transition-colors ${
                  isActive
                    ? `${colors} border-current/20`
                    : "text-zinc-600 border-zinc-800/50 hover:text-zinc-400"
                }`}
              >
                {lane}
              </button>
            );
          })}
        </div>
      )}

      {/* Days */}
      {visibleDays.length === 0 ? (
        <EmptyState icon={RadarIcon} message="No items match the selected lanes." />
      ) : (
        visibleDays.map((day) => {
          const isOpen = openDates.has(day.date);
          const totalItems = day.sections.reduce((sum, s) => sum + s.items.length, 0);
          return (
            <div key={day.date} className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 flex flex-col">
              <button
                onClick={() => toggleDay(day.date)}
                className="flex items-center justify-between px-4 py-3 w-full text-left hover:bg-zinc-800/20 transition-colors rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <RadarIcon size={14} className="text-teal-500" />
                  <span className="text-sm font-medium text-zinc-200">{day.label}</span>
                  <span className="text-xs text-zinc-600 font-mono">{totalItems} items</span>
                </div>
                {isOpen
                  ? <ChevronDown size={14} className="text-zinc-600" />
                  : <ChevronRight size={14} className="text-zinc-600" />
                }
              </button>

              {isOpen && (
                <div className="border-t border-zinc-800/30">
                  {day.sections.map((section, sIdx) => (
                    <div key={section.heading}>
                      <div className={`px-4 py-2 ${sIdx > 0 ? "border-t border-zinc-800/30" : ""}`}>
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">
                          {section.heading} · {section.items.length}
                        </span>
                      </div>
                      <div className="divide-y divide-zinc-800/20">
                        {section.items.map((item: RadarItem) => {
                          const laneBg = laneColors[item.lane]?.bg || "";
                          return (
                            <div
                              key={item.id}
                              className={`px-4 py-3 hover:bg-zinc-800/40 transition-colors group ${laneBg}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <LaneTag lane={item.lane} />
                                    {item.link ? (
                                      <a
                                        href={item.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 transition-colors hover:underline"
                                      >
                                        {item.title}
                                      </a>
                                    ) : (
                                      <span className="text-sm font-medium text-zinc-200">{item.title}</span>
                                    )}
                                    {item.link && (
                                      <a href={item.link} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink size={12} className="text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
                                      </a>
                                    )}
                                  </div>
                                  {item.note && (
                                    item.note.includes("\n") ? (
                                      <ul className="text-sm text-zinc-500 leading-relaxed space-y-0.5 mt-1">
                                        {item.note.split("\n").map((bullet, bIdx) => (
                                          <li key={bIdx} className="flex gap-2">
                                            <span className="text-zinc-700 shrink-0">·</span>
                                            <span>{bullet}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-sm text-zinc-500 leading-relaxed">{item.note}</p>
                                    )
                                  )}
                                </div>
                                <button
                                  onClick={() => deleteItem(day.date, item.id)}
                                  className="text-zinc-700 hover:text-red-400 transition-colors p-0.5 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5"
                                  title="Delete item"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: clean. Component isn't used anywhere yet so no runtime impact.

**Step 3: Commit**

```bash
git add src/components/radar-week-view.tsx
git commit -m "feat: add RadarWeekView component with collapsible days, lane filter, delete"
```

---

### Task 4: Create `/admin/radar/[week]` page

**Files:**
- Create: `src/app/admin/radar/[week]/page.tsx`

**Context:** Direct mirror of `src/app/admin/engage/[week]/page.tsx`. Uses `RadarWeekView` instead of `EngageView`, and `Radar` icon.

**Step 1: Create the page**

```tsx
import { notFound } from "next/navigation";
import { fetchRadarWeek, fetchRadarWeekStarts } from "@/lib/db";
import { getWeekBounds, formatWeekLabel } from "@/lib/newsletter-weeks";
import { RadarWeekView } from "@/components/radar-week-view";
import { WeekSelector } from "@/components/week-selector";
import { Radar as RadarIcon } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ week: string }>;
}

export default async function RadarWeekPage({ params }: Props) {
  const { week } = await params;

  const parsed = new Date(week + "T12:00:00Z");
  if (isNaN(parsed.getTime()) || parsed.getUTCDay() !== 1) {
    notFound();
  }

  const { start, end } = getWeekBounds(week);
  const [days, weekStarts] = await Promise.all([
    fetchRadarWeek(start, end),
    fetchRadarWeekStarts(),
  ]);

  const totalItems = days.reduce((sum, d) => sum + d.sections.reduce((s2, s) => s2 + s.items.length, 0), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <RadarIcon size={14} className="text-teal-500" />
            {weekStarts.length > 0 ? (
              <WeekSelector currentWeek={week} availableWeeks={weekStarts} basePath="/admin/radar" />
            ) : (
              <span className="text-sm font-medium text-zinc-200">{formatWeekLabel(week)}</span>
            )}
          </div>
          <span className="text-xs text-zinc-600 font-mono">{totalItems} items</span>
        </div>
      </div>
      <RadarWeekView days={days} />
    </div>
  );
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: clean.

**Step 3: Commit**

```bash
git add src/app/admin/radar/[week]/page.tsx
git commit -m "feat: add /admin/radar/[week] server route"
```

---

### Task 5: Update `/admin/radar` to redirect to current week

**Files:**
- Modify: `src/app/admin/radar/page.tsx`

**Context:** Replace the entire file. Currently it renders `RadarView` directly; now it should redirect to the current week Monday, same as engage.

**Step 1: Replace the file contents**

```tsx
import { redirect } from "next/navigation";
import { getCurrentWeekMonday } from "@/lib/newsletter-weeks";

export default function AdminRadar() {
  redirect(`/admin/radar/${getCurrentWeekMonday()}`);
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: clean.

**Step 3: Commit**

```bash
git add src/app/admin/radar/page.tsx
git commit -m "feat: redirect /admin/radar to current week slug"
```

---

### Task 6: Delete `RadarView` component

**Files:**
- Delete: `src/components/radar-view.tsx`

**Context:** No longer used — `RadarView` was only imported by the old `/admin/radar/page.tsx` which is now a redirect. Verify no other imports before deleting.

**Step 1: Check for remaining imports**

```bash
grep -r "radar-view" src/
```

Expected: no results (zero imports remaining).

**Step 2: Delete the file**

```bash
rm src/components/radar-view.tsx
```

**Step 3: Verify build**

```bash
npm run build
```

Expected: clean.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: remove RadarView (replaced by RadarWeekView)"
git push
```

---

## Verification Checklist

After all tasks complete:

- [ ] `/admin/radar` redirects to `/admin/radar/YYYY-MM-DD` (current week Monday)
- [ ] Week selector shows available weeks, navigates correctly
- [ ] Days are collapsible; most recent opens by default
- [ ] Lane filter buttons toggle on/off, hide non-matching items across all days
- [ ] Days with zero lane-filtered items disappear
- [ ] Hover on an item reveals trash icon; clicking deletes optimistically
- [ ] `npm run build` passes clean
- [ ] Pushed to GitHub
