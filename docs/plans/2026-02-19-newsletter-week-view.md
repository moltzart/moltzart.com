# Newsletter Week View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the flat newsletter page with a week-scoped view (Mon–Fri) and a dropdown selector for navigating previous weeks.

**Architecture:** `/admin/newsletter` redirects to the current week's slug (`/admin/newsletter/2026-02-16`). The dynamic `[week]` route fetches only that week's articles from Neon and renders a week-selector dropdown in the header. Week helpers live in a new `newsletter-weeks.ts` utility file. No DB schema changes.

**Tech Stack:** Next.js 15 App Router (async params), TypeScript, Neon Postgres (`@neondatabase/serverless`), Tailwind v4, Lucide React.

---

### Task 1: Create week boundary helpers

**Files:**
- Create: `src/lib/newsletter-weeks.ts`

**Step 1: Create the file**

```typescript
// src/lib/newsletter-weeks.ts

/**
 * Returns the Monday ISO date for the week containing isoDate.
 * Sat/Sun roll forward to the next Monday.
 */
export function getWeekMonday(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00Z");
  const day = d.getUTCDay(); // 0=Sun, 1=Mon … 6=Sat
  const offset = day === 0 ? 1 : day === 6 ? 2 : -(day - 1);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

/** Returns { start: monday, end: friday } for a given Monday ISO date. */
export function getWeekBounds(monday: string): { start: string; end: string } {
  const d = new Date(monday + "T12:00:00Z");
  const start = d.toISOString().slice(0, 10);
  d.setUTCDate(d.getUTCDate() + 4);
  return { start, end: d.toISOString().slice(0, 10) };
}

/** Returns the Monday of the current week. */
export function getCurrentWeekMonday(): string {
  return getWeekMonday(new Date().toISOString().slice(0, 10));
}

/**
 * Formats a Monday ISO date as a human-readable label.
 * "2026-02-16" → "Feb 16–20, 2026"
 */
export function formatWeekLabel(monday: string): string {
  const d = new Date(monday + "T12:00:00Z");
  const friday = new Date(monday + "T12:00:00Z");
  friday.setUTCDate(friday.getUTCDate() + 4);
  const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return `${month} ${d.getUTCDate()}–${friday.getUTCDate()}, ${d.getUTCFullYear()}`;
}
```

**Step 2: Verify it builds**

```bash
npm run build
```
Expected: no TypeScript errors on this file.

**Step 3: Commit**

```bash
git add src/lib/newsletter-weeks.ts
git commit -m "feat: add newsletter week boundary helpers"
```

---

### Task 2: Add DB functions for week-scoped queries

**Files:**
- Modify: `src/lib/db.ts`

**Context:** `db.ts` already has `fetchNewsletterDigests()` (fetches all articles) and a private `formatDayLabel()` helper at line 327. `NewsletterDigest` and `NewsletterArticle` interfaces are already defined. Add these two functions after the existing `fetchNewsletterDigests` block (around line 266).

**Step 1: Add import at top of db.ts**

At the top of `src/lib/db.ts`, add the import after any existing imports:

```typescript
import { getWeekMonday } from "@/lib/newsletter-weeks";
```

**Step 2: Add the two new functions**

Insert after the closing brace of `fetchNewsletterDigests()` (line 266), before `// --- Radar (grouped view) ---`:

```typescript
export async function fetchNewsletterWeek(start: string, end: string): Promise<NewsletterDigest[]> {
  const rows = await sql()`
    SELECT * FROM newsletter_articles
    WHERE digest_date BETWEEN ${start} AND ${end}
    ORDER BY digest_date ASC, created_at ASC
  `;
  if (rows.length === 0) return [];

  const byDate = new Map<string, NewsletterArticle[]>();
  for (const r of rows) {
    const date = toDateStr(r.digest_date);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push({
      title: r.title,
      description: r.description || "",
      source: r.source || "",
      link: r.link || "",
      category: r.category || undefined,
    });
  }

  const digests: NewsletterDigest[] = [];
  for (const [date, articles] of byDate) {
    digests.push({ date, label: formatDayLabel(date), articles, articleCount: articles.length });
  }
  return digests;
}

/** Returns all distinct week-start Mondays that have newsletter articles, sorted newest first. */
export async function fetchNewsletterWeekStarts(): Promise<string[]> {
  const rows = await sql()`SELECT DISTINCT digest_date FROM newsletter_articles ORDER BY digest_date DESC`;
  const seen = new Set<string>();
  for (const r of rows) {
    seen.add(getWeekMonday(toDateStr(r.digest_date)));
  }
  return [...seen].sort().reverse();
}
```

**Step 3: Build to verify**

```bash
npm run build
```
Expected: clean build, no TypeScript errors.

**Step 4: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat: add fetchNewsletterWeek and fetchNewsletterWeekStarts"
```

---

### Task 3: Create WeekSelector client component

**Files:**
- Create: `src/components/week-selector.tsx`

**Step 1: Create the file**

```tsx
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
```

**Step 2: Build to verify**

```bash
npm run build
```
Expected: clean build.

**Step 3: Commit**

```bash
git add src/components/week-selector.tsx
git commit -m "feat: add WeekSelector client component"
```

---

### Task 4: Create the dynamic [week] route

**Files:**
- Create: `src/app/admin/newsletter/[week]/page.tsx`

**Step 1: Create the directory and file**

```bash
mkdir -p src/app/admin/newsletter/\[week\]
```

```tsx
// src/app/admin/newsletter/[week]/page.tsx
import { notFound } from "next/navigation";
import { fetchNewsletterWeek, fetchNewsletterWeekStarts } from "@/lib/db";
import { getWeekBounds, formatWeekLabel } from "@/lib/newsletter-weeks";
import { NewsletterView } from "@/components/newsletter-view";
import { WeekSelector } from "@/components/week-selector";
import { Newspaper } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ week: string }>;
}

export default async function NewsletterWeekPage({ params }: Props) {
  const { week } = await params;

  // Validate: must be a valid date that is a Monday (getUTCDay() === 1)
  const parsed = new Date(week + "T12:00:00Z");
  if (isNaN(parsed.getTime()) || parsed.getUTCDay() !== 1) {
    notFound();
  }

  const { start, end } = getWeekBounds(week);
  const [digests, weekStarts] = await Promise.all([
    fetchNewsletterWeek(start, end),
    fetchNewsletterWeekStarts(),
  ]);

  const totalArticles = digests.reduce((sum, d) => sum + d.articles.length, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Newspaper size={14} className="text-teal-500" />
            {weekStarts.length > 0 ? (
              <WeekSelector currentWeek={week} availableWeeks={weekStarts} />
            ) : (
              <span className="text-sm font-medium text-zinc-200">{formatWeekLabel(week)}</span>
            )}
          </div>
          <span className="text-xs text-zinc-600 font-mono">{totalArticles} articles</span>
        </div>
      </div>
      <NewsletterView digests={digests} />
    </div>
  );
}
```

**Step 2: Build to verify**

```bash
npm run build
```
Expected: clean build. The `[week]` route should appear in the build output.

**Step 3: Commit**

```bash
git add src/app/admin/newsletter/\[week\]/page.tsx
git commit -m "feat: add newsletter [week] dynamic route"
```

---

### Task 5: Update index page to redirect to current week

**Files:**
- Modify: `src/app/admin/newsletter/page.tsx`

**Step 1: Replace the file contents**

Current content (3 lines — replace entirely):

```tsx
import { redirect } from "next/navigation";
import { getCurrentWeekMonday } from "@/lib/newsletter-weeks";

export default function AdminNewsletter() {
  redirect(`/admin/newsletter/${getCurrentWeekMonday()}`);
}
```

Note: No `export const dynamic` needed — `redirect()` makes Next.js treat this as dynamic automatically.

**Step 2: Build to verify**

```bash
npm run build
```
Expected: clean build with no errors. `fetchNewsletterDigests` is now unused in this file — confirm no lingering import.

**Step 3: Commit and push**

```bash
git add src/app/admin/newsletter/page.tsx
git commit -m "feat: redirect /admin/newsletter to current week slug"
git push
```

---

### Verification

After all tasks:

1. Visit `/admin/newsletter` — should redirect to `/admin/newsletter/2026-02-16` (current week Monday)
2. Articles for Feb 16–20 should appear grouped by day
3. Week selector dropdown should show available weeks
4. Selecting a previous week should navigate to `/admin/newsletter/<that-monday>` and show only that week's articles
5. An invalid slug like `/admin/newsletter/not-a-date` should return 404
6. A valid date that isn't a Monday like `/admin/newsletter/2026-02-19` should return 404
