# Newsletter Week View Design

Date: 2026-02-19

## Problem

The `/admin/newsletter` page shows all articles flat with no date filtering. As Pica ingests more newsletters, the page becomes unwieldy. Articles need to be organized by Mon–Fri week, with navigation to previous weeks.

## Approved Design

### Routing

- `/admin/newsletter` — computes current week's Monday, redirects to the week slug
- `/admin/newsletter/[week]` — dynamic route; `week` param is the week-start Monday as ISO date (e.g. `2026-02-16`). Invalid slugs return 404.

Slug format is raw ISO Monday date — no encoding needed, trivial to parse.

### Data Layer

Two new functions in `src/lib/db.ts`:

- `fetchNewsletterWeek(start: string, end: string): Promise<NewsletterDigest[]>` — queries `newsletter_articles WHERE digest_date BETWEEN start AND end`, groups by day, returns same `NewsletterDigest[]` shape `NewsletterView` already consumes.
- `fetchNewsletterWeekStarts(): Promise<string[]>` — queries all distinct `digest_date` values, computes the Monday for each in JS, deduplicates, returns sorted DESC. Populates the week selector dropdown.

Week boundary helpers in `src/lib/newsletter-weeks.ts`:

- `getCurrentWeekMonday(): string` — returns today's Monday as ISO string
- `getWeekBounds(monday: string): { start: string; end: string }` — returns `{ start: monday, end: friday }` (monday + 4 days)
- `formatWeekLabel(monday: string): string` — returns human label e.g. `"Feb 16–20, 2026"`

### Components

- `WeekSelector` (`src/components/week-selector.tsx`) — client component. Styled `<select>` in the card header showing the current week label. On change, calls `router.push()` to navigate to the selected slug.
- `NewsletterView` — no changes. Already accepts `NewsletterDigest[]`.

### Files Changed

| File | Action |
|------|--------|
| `src/lib/newsletter-weeks.ts` | Create — week boundary helpers |
| `src/lib/db.ts` | Edit — add `fetchNewsletterWeek`, `fetchNewsletterWeekStarts` |
| `src/app/admin/newsletter/page.tsx` | Edit — redirect to current week slug |
| `src/app/admin/newsletter/[week]/page.tsx` | Create — dynamic route |
| `src/components/week-selector.tsx` | Create — week dropdown |

No DB migrations required. Schema is already correct.

### Constraints

- Weeks are Monday–Friday only
- Week boundary helpers treat Saturday/Sunday digest dates as belonging to the following Monday's week
