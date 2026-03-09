# Project Log

## 2026-03-09 (session 25)

- Newsletter page redesign: replaced redirect-to-current-week with an editions table (`/admin/newsletter`) showing all weeks with article/day counts. Week detail (`/admin/newsletter/[week]`) now shows a flat sortable article table instead of collapsible day panels.
- Extracted `SortableDataTable` from `projects-view.tsx` into `src/components/admin/sortable-data-table.tsx` as a shared generic component with `rowHref`, `rowKey`, and `rowAction` props. Projects view updated to import from shared component.
- Added `fetchNewsletterWeekSummaries()` to `db.ts` — groups articles by week-Monday, returns `{ week, articleCount, dayCount }[]`.
- Replaced raw `<select>` in `WeekSelector` with shadcn `Select` component (added `src/components/ui/select.tsx`). Moved selector into PageHeader's actions slot (right-aligned next to title).
- Created `src/components/newsletter-editions-table.tsx` (editions landing) and rewrote `src/components/newsletter-view.tsx` as `NewsletterArticlesTable` (flat article table with delete action).
- **Decision:** Two-level newsletter layout: Level 1 is an editions overview table (one row per week), Level 2 is a flat article table for the week. No collapsible day panels — days are a sortable column. Keeps everything scannable and consistent with the projects table pattern.
- **Decision:** Extracted `SortableDataTable` as shared component rather than duplicating. It's generic enough and already used on two pages (projects, newsletter editions). The `rowAction` prop supports non-link interactions (delete buttons) alongside `rowHref` for linked rows.
- **Learned:** The `meta` prop on `AdminPageIntro` renders below the title in muted text — not right-aligned. Use `actions` (or `children` via `PageHeader`) for right-aligned controls like selectors.
- **Learned:** Native `<select>` looks broken in dark themes (white dropdown, OS-styled options). Always use shadcn `Select` (Radix-based) for consistent dark-theme dropdowns.
- **Next:** Day grouping in the article table is flat (Day column, sortable). Matt was asked if he wants visual day dividers — left open. Also: no commit/push yet this session — need to commit all changes and push.

## 2026-03-06 (session 24)

- Removed subtitles from all 9 admin page headers — list pages are title-only, detail pages keep breadcrumbs.
- Removed `syncCronDefinitionsFromOpenClaw` — the TODO.md fallback that read `../openclaw-home/TODO.md` on every calendar page load and re-upserted cron definitions, overwriting telemetry API data. Deleted all markdown parsing helpers (`extractRecurringRows`, `parseDayPrefix`, `parseTimeToCron`, etc.), GitHub fetch logic, and `scheduleSource` from `OpenClawCronMeta`. Telemetry API (`/api/ingest/crons`) is now the sole source of truth for cron definitions.
- Added `sync: true` flag to `/api/ingest/crons` — when set, `replaceCronJobsSnapshot` disables any `cron_jobs` rows not in the payload. Without the flag, behavior is additive-only (`upsertCronJobs`).
- Added guard in `categorizeCrons` for empty/malformed `schedule_expr` (< 5 fields) to prevent `parseCronField` crash.
- Added deduplication for `alwaysRunning` crons to prevent React duplicate key errors from duplicate DB rows.
- Manually cleaned up orphaned cron rows in Neon DB: disabled 6 old X Draft/Post slug-based crons, 10 UUID-based duplicates, and 1 meta-task (`Push Cron Telemetry` with empty schedule_expr). Enabled 4 new X Post crons.
- Committed and pushed sessions 20-24 (71 files, 5336 insertions) to unblock Vercel deploy.
- **Decision:** Telemetry API is the sole source of truth for cron definitions. No file-based fallbacks. The `sync: true` flag gives the caller control over whether a push is a full snapshot (prunes stale) or additive.
- **Decision:** All admin page headers are title-only. Detail pages keep breadcrumbs for navigation but no subtitles.
- **Learned:** `syncCronDefinitionsFromOpenClaw` ran on every calendar page load and called `replaceCronJobsSnapshot`, which disabled any DB rows not in the parsed markdown. This meant telemetry API pushes were immediately overwritten by the next page load. Two competing write paths to the same table = guaranteed data corruption.
- **Learned:** When renaming crons, the old DB rows persist because the ingest API only upserts — it never deletes. Without a `sync` mode, orphaned rows accumulate forever.
- **Watch:** Mozart's push script now sends `sync: true`. If he ever sends a partial job list (not the full set), it will disable everything else. The flag means "this is ALL the active jobs."
- **Watch:** The 4 new X Post crons have no run history for today — telemetry runs were recorded against old job IDs. Green status will appear starting tomorrow.
- **Watch:** `reconcileTelemetryJobs` has complex ID matching logic (identity key, schedule fallback, UUID detection). If Mozart changes both name and schedule simultaneously, reconciliation may create a new row instead of updating the existing one.
- **Next:** Mozart needs to verify his push script sends correct `agent_id` values (known keys: `moltzart`, `scout`, `pica`, `hawk`, `sigmund`) and display-quality names. Monitor tomorrow's calendar to confirm the new X Post crons show green after their first full day of runs.

## 2026-03-05 (session 23)

- Dashboard redesign: replaced 5-panel layout (MetricStrip, Now, Watch, Latest, Newsletter Picks) with a focused 3-section single-column stack: Action Queue (blocked/urgent/ready tasks in a Panel), Health Strip (agents/blocked/completion as inline signals), and Recent Activity (one-line latest event). Deleted `src/components/dashboard/` directory (orphaned `newsletter-highlights.tsx` and `stat-card.tsx`).
- Removed `eyebrow` prop from `AdminPageIntro` and all 9 admin pages that used it ("Operational Workbench", "Signal Board", "Weekly Review", etc.).
- Stripped all subtitles, meta lines, and descriptions from every admin page header. All list pages now use title-only `AdminPageIntro`. Detail pages keep breadcrumbs but no subtitle/meta.
- Removed MetricStrip from tasks page (redundant with kanban column headers).
- Fixed `AdminPageIntro` divider: border tokens now use documented values (`border-zinc-800` default, `border-zinc-800/50` soft). Added `mb-4` to match `pb-4` for symmetrical spacing around the divider line.
- Added "Page Headers" section to `/admin/styleguide/spacing` with 7 live preview containers showing every `AdminPageIntro` configuration (title only, title+subtitle, breadcrumbs, divider variants, etc.).
- **Decision:** Dashboard follows "action queue + health strip + breadcrumb trail" pattern — single column, priority-stacked. No decorative metrics. Every pixel earns its space. Newsletter/research have their own pages; dashboard doesn't duplicate them.
- **Decision:** All admin page headers are title-only. Subtitles and meta text were noise — the page content is the orientation. Detail pages keep breadcrumbs for navigation structure.
- **Decision:** `AdminPageIntro` divider uses `border-zinc-800` (strong separator from UI Guidelines) for default, `border-zinc-800/50` for soft. Previous values (`/40`, `/60`) were invented and didn't match the documented border system.
- **Learned:** When `AdminPageIntro` has `pb-X` above its `border-b` but no `mb-X` below, the gap below the line depends entirely on the parent's `space-y`. This creates asymmetric spacing that's invisible in the component but visible on every page. The component must own both sides of its divider spacing.
- **Learned:** The UI Guidelines document 3 border tiers: `border-zinc-800/30` (subtle/inside cards), `border-zinc-800` (section dividers), `border-zinc-700/50` (panel borders). Using values outside these tiers creates visual inconsistency.
- **Watch:** Drafts and Newsletter pages lost their `WeekSelector` action buttons when page headers were stripped to title-only. These are functional controls — may need to be re-added as inline controls within the page content rather than in the header.
- **Watch:** The health strip shows "0/12 on schedule" for agents because `fetchJobRunsForRange` is date-scoped and agents may not have run yet today. This is correct behavior but looks alarming first thing in the morning.
- **Watch:** 47+ files are still uncommitted on main from sessions 22-23. Need to commit and push.
- **Next:** Commit and push all changes. Re-evaluate whether WeekSelector needs to come back as an inline control on Drafts/Newsletter pages. Consider whether the public `/tasks` page header (which lost its subtitle and kept action children) still looks right.

## 2026-03-05 (session 22)

- Unified badge system: rewrote `badge.tsx` with 3 variants (`default`, `outline`, `status`) and 2 shapes (`default`, `pill`). Refactored `tag-badge.tsx` wrappers (LaneTag, SourceTag, etc.) to compose on Badge instead of raw spans with a duplicated `tagBase` string.
- Overhauled styleguide badges page: structured as Variants → Shapes → With Icons → Status Colors → Domain Wrappers → StatusDot, with reference tables and descriptions.
- Overhauled styleguide cards page: added Container Hierarchy reference table (Panel/Card/Table with nesting rules), interactive vs static table examples with StatusDot + hover rows, column type reference, do/don't rules section. Removed redundant Border Patterns section.
- All reference tables now use consistent styling: `bg-zinc-900/60` header bg, `text-xs` headers, `text-xs` body, `rounded-lg` shell.
- Added `border-b border-zinc-800 pb-6` divider to PageHeader title row, separating it from content below.
- Styleguide sidebar "Navigation" label downsized from `type-label` (`text-xs`) to raw `text-2xs uppercase tracking-[0.08em] font-medium` to sit subordinate to nav items.
- **Decision:** One Badge component covers all use cases (category tags, status indicators, count pills, metadata labels). Domain wrappers (LaneTag, SourceTag, etc.) are convenience components that compose on Badge with preset color maps — not a separate system.
- **Decision:** Badge `status` variant provides `border` only and expects a color triad via className (`bg-{c}-400/10 text-{c}-400 border-{c}-400/20`). Colors are data-driven, not enumerated in CVA.
- **Decision:** Tables use `bg-zinc-900/60` on header rows for visual anchoring. Dates/numbers right-aligned with `font-mono`. This is now the canonical table pattern.
- **Learned:** `type-badge` is a typography class for badge text styling (tiny mono uppercase), NOT a semantic substitute for labels. Using it on section labels because it's "smaller" is wrong — it changes the semantic role. If `type-label` is too large, create a `type-label-sm` or use raw utilities.
- **Watch:** PageHeader now has `pb-6 border-b border-zinc-800` on the title row. This affects every admin page. Pages with breadcrumbs already had their own `mb-8 pb-4 border-b` on the breadcrumb row — so pages with breadcrumbs now have two horizontal rules (breadcrumb divider + title divider).
- **Watch:** The styleguide nav label uses raw utilities (`text-2xs uppercase tracking-[0.08em] font-medium`) instead of a `type-*` class. Should add `type-label-sm` to the type system if this pattern recurs.
- **Watch:** The old shadcn Badge variants (`secondary`, `destructive`, `ghost`, `link`) are deleted. Any code outside the styleguide still importing Badge with those variants will get no matching styles. The app-wide sweep hasn't been done yet — inline badge spans in tasks-view, drafts-view, calendar-view, etc. still use raw `<span>` elements.
- **Next:** App-wide badge/card sweep deferred until all styleguide pages are done. Remaining styleguide pages needing polish: form-elements (thinnest — no selects, checkboxes, toggles), spacing, motion. Also need to decide on `type-label-sm` addition. Commit and push all changes.

## 2026-03-05 (session 21)

- Rebuilt styleguide from scratch: left sidebar nav with icons + 8 separate route pages (palette, typography, buttons, form-elements, badges, cards, spacing, motion). Modeled after mattdowney.com/styleguide layout.
- Palette page restructured into Core Tokens (6 swatches) and 9-Step Color Tokens (100-900 scale table) instead of the old backgrounds/text-hierarchy/status-colors layout.
- Type scale toned down for tool UI: removed `type-display` and `type-lead`, rebased headings to h1=text-xl, h2=text-lg, h3=text-base. Entire heading range is now 16-24px.
- Button component (`button.tsx`) sizes reworked: old scale was inverted (default h-12 was tallest, lg h-10 shorter). New scale: xs=28px, sm=32px, default=36px, lg=40px. Default SVG icon size 14px, gap 6px.
- Added 960px max-width container (`max-w-[960px] mx-auto`) to admin layout for all pages.
- Added 1px section dividers (`divide-zinc-700/50`) between all styleguide sections.
- Standardized all mono token callouts to `text-2xs font-mono text-teal-400` — removed inconsistent amber-300 usage.
- Added Dividers section to Cards page documenting section divider, subtle divider, and divide utility patterns.
- **Decision:** Styleguide section headings use `type-body font-medium text-zinc-100` — not type-label or any heading class. This keeps them subordinate to the page title in the sidebar.
- **Decision:** Mono token/variable names in the styleguide use `text-2xs font-mono` (two steps down from `type-code` which is text-sm). Prevents code callouts from visually competing with content.
- **Decision:** Button size scale must be monotonically increasing (xs < sm < default < lg). Previous shadcn default had default as the tallest button — this was wrong for a tool UI.
- **Learned:** The original shadcn button sizes are designed for marketing sites (h-12 default). For admin/tool UI, the whole scale needs to compress. 28-40px range covers all needs.
- **Watch:** `type-display` and `type-lead` CSS classes are deleted from globals.css. Any future code referencing them will silently get no styles applied. The blog post title uses `type-h1` which is now text-xl (was text-3xl).
- **Watch:** The 960px max-width is on the admin layout `<main>` tag, affecting every admin page. If any page needs to go wider, it'll need to override this.
- **Next:** Buttons styleguide page is solid. Other pages (form-elements, badges, cards, spacing, motion) could use the same level of polish — form-elements is thinnest (no selects, checkboxes, toggles). Commit and push all changes.

## 2026-03-05 (session 20)

- Comprehensive styleguide overhaul: 5-page reference at `/admin/styleguide` (overview, foundations, components, patterns, motion) with interactive demos, live component showcases, and Framer Motion presets. Deleted old `/styleguide` route.
- Extracted `PanelHeader` sub-component from `panel.tsx` — standardizes the icon + title + count + action link pattern used in ~9 places. Adopted in 6 admin pages.
- CSS token fixes: `.type-body-sm` differentiated to `text-xs`, all `divide-zinc-800` normalized to `/30`, `prose-sm` and `[&_hr+p]:text-zinc-500` added to `.doc-markdown` CSS, MarkdownRenderer switched from 2000-char inline className to CSS classes.
- `active:scale-[0.98]` added to shadcn Button CVA base (with `disabled:active:scale-100`). All Button usages get press feedback automatically.
- Inlined `GRAINIENT_COLORS` into `page.tsx`, deleted `design-tokens.ts`.
- **Decision:** `PanelHeader` assumes teal icon color (`text-teal-400`). The products-view and projects-view headers use status-dependent icon colors, so they keep manual headers. This is intentional — PanelHeader serves the ~80% case.
- **Decision:** Styleguide pages excluded from both `check-spacing-grid.mjs` and `check-ui-guidelines.mjs` — they document the full design system including values the lint rules flag in normal code (fractional spacing, off-scale steps shown as data labels).
- **Learned:** The custom `lint:spacing` script matches class-like patterns inside JS string literals (data arrays), not just className props. File-level excludes are the cleanest fix for documentation pages.
- **Watch:** MarkdownRenderer now applies `doc-markdown doc-markdown-compact` by default. Previously the inline classes matched `doc-markdown-compact` sizing but not exactly `doc-markdown` (it had `prose-sm` which `doc-markdown` didn't). Added `prose-sm` to `.doc-markdown-compact` in CSS to preserve the same rendering.
- **Next:** Consider adding `StatusTag` showcase to components page (skipped because it requires `ProjectStatus` type import chain). WeekSelector upgrade to shadcn Select was deferred per plan (2c, lower priority).

## 2026-03-04 (session 19)

- Restructured `/admin/research/[id]` layout: breadcrumb gets a 1px divider below it, badges (domain tag + project link) moved to separate positions — project is now a breadcrumb segment, domain tag sits next to the date below the title. Removed Panel wrapper from markdown content, replaced with a vertical `border-r` divider between content and TOC columns.
- Added `skipFirstH1` prop to `MarkdownRenderer` — suppresses the first `<h1>` in rendered markdown to avoid triple-title (breadcrumb + PageHeader h1 + markdown h1).
- Overhauled markdown table styling with custom ReactMarkdown components — rounded bordered container, header background, proper cell padding, row dividers. Replaced inline prose-table/th/td utilities.
- Dropped all body text to `text-sm` (14px) per design system — updated `.type-body`, `.doc-markdown` prose rules, and `MarkdownRenderer` inline classes. Added `prose-sm` base modifier.
- Added `Grainient` WebGL background component (from react-bits) to the public homepage. Installed `ogl` dependency. Created `DialKit` tuner for real-time prop tuning, then locked in final values and removed DialKit.
- Also created `FaultyTerminal` component (react-bits) but removed it in favor of Grainient.
- Homepage text updated: all elements use `text-zinc-100`, title/arrows/social icons at 40% opacity.
- **Decision:** `PageHeader` breadcrumb divider (`mb-8 pb-4 border-b border-zinc-800`) is in the shared component, affecting all admin pages with breadcrumbs. This is intentional — consistent section separation.
- **Decision:** Research page TOC column now starts at the same grid row as the title (grid wraps everything, not just content). Gives better vertical alignment.
- **Learned:** WebGL background components with `-z-10` won't receive mouse events — the content layer blocks them. Fix: listen on `window` instead of the container element for mouse tracking.
- **Learned:** OGL components using `window.devicePixelRatio` in default props break SSR/static generation. Guard with `typeof window !== "undefined"`.
- **Watch:** The `MarkdownRenderer` now always passes a `components` object (tables, and conditionally h1/h2). Previously it was `undefined` when `generateIds` was false. No breakage observed but worth knowing if debugging rendering differences.
- **Watch:** `dialkit` and `motion` packages are installed but only used by the tuner components (not in production renders). Could be removed as devDependencies if bundle size matters.
- **Next:** Commit and push all changes. FaultyTerminal component + tuner files can be cleaned up (dead code) if not needed as a future option. Grainient tuner files similarly optional to keep.

## 2026-03-04 (session 18)

- Refocused `/admin/calendar` as an **agent accountability view** — removed tasks, drafts, newsletter (those belong on their own pages). Calendar now exclusively tracks scheduled cron jobs and their execution status.
- Seeded `cron_jobs` with 13 known agent schedules from STANDING-ORDERS.md (Moltzart, Sigmund, Pica, Scout, system jobs). X Draft Review seeded as disabled.
- Created `job_runs` table (id, job_id FK, agent_id, started_at, completed_at, status, summary) with indexes on started_at and job_id. Agents will POST execution reports here.
- Added `POST /api/ingest/crons/run` endpoint — agents report job starts/completions. Supports both creating new runs and updating existing ones (via `run_id`).
- Added `DbJobRun` interface and DB functions: `insertJobRun`, `updateJobRun`, `fetchJobRunsForRange`.
- `CalendarView` now cross-references projected cron times with actual `job_runs` entries. Each event card shows status: green dot (ran), red (error), amber (missed), dim (upcoming), blue pulse (running).
- Replaced `cron-parser` library with a manual cron field expander. Removed `cron-parser` dependency entirely.
- UI refinements per Matt's feedback: Monday-start weeks, past day columns dimmed (not future), date numbers in column headers, removed Week/Today buttons (arrows + refresh only), "Always On" pills moved to a row above the grid with legend right-aligned, always-on pills use uniform zinc color.
- **Decision:** Run matching is date-based (job_id + date key), not exact-time. A job with a run anywhere in the same day counts as matched — agents may run slightly off-schedule.
- **Decision:** Manual cron expander over `cron-parser` library. Parses the 5 standard cron fields (specific values, `*`, `*/N`, ranges, comma-lists) and matches against each day's DOW. No timezone-aware Date iteration needed — pure field matching.
- **Watch:** `cron-parser` v5.5.0 has a confirmed DST bug — it silently skips the entire spring-forward day (March 8, 2026 for ET). The iterator returns "Out of the time span range" with zero results regardless of buffer size. This affected Sunday display. The manual expander completely sidesteps this since it never constructs timezone-dependent Date objects for iteration.
- **Learned:** The DST bug wasn't in Date construction or filtering — it was deep in cron-parser's internal iterator. Per-day parsing with buffers didn't help because the library itself refuses to generate any occurrence on the DST transition day. Only fix is to not use the library's iterator at all.
- **Next:** Agents need to start calling `POST /api/ingest/crons/run` when their scheduled jobs execute. Until then, all past events show as "missed." Commit + push still pending.

## 2026-03-04 (session 17)

- Built `/admin/calendar` page — monthly grid consolidating cron jobs, tasks, X drafts, and newsletter articles into a single view.
- Created `cron_jobs` table via Neon MCP (id, name, agent_id, enabled, schedule_expr, schedule_tz, last_run_at, last_status, last_duration_ms, next_run_at, consecutive_errors, synced_at).
- Added ingest endpoint `POST/GET /api/ingest/crons` for agents to sync cron job state.
- Added month-range DB queries: `fetchTasksForMonth`, `fetchXDraftsForMonth`, `fetchNewsletterForMonth`.
- `CalendarView` client component: monthly grid with colored count pills per day (blue=crons, green=tasks, purple=drafts, orange=newsletter), prev/next/today navigation, click-to-expand day detail panel.
- Cron projection uses `cron-parser` client-side to expand schedule expressions onto visible month days. Future runs shown at reduced opacity.
- Admin API route `GET /api/admin/calendar?year=&month=` for month navigation (cookie auth).
- Added Calendar entry to sidebar Operations group with `CalendarDays` icon.
- **Decision:** Cron runs are projected client-side from `schedule_expr` rather than stored per-execution. This means the calendar shows scheduled times, not actual run times — but `last_run_at`/`last_status` on the job provides the most recent actual result.

## 2026-03-03 (session 16)

- Applied 3 pending migrations via Neon MCP: `projects` table (replacing `product_ideas` as primary org unit), `research_artifacts` table, tasks board workflow (`backlog/todo/in_progress/done` + `board_order`).
- Built research UI: `/admin/research` list page grouped by project with collapsible sections, `/admin/research/[id]` detail page with sticky sidebar TOC (IntersectionObserver active heading tracking), breadcrumbs, and long-scroll markdown body.
- Created `bookyour.hair` project, linked Moltzart's two ingested research artifacts (Channel Research + GTM Plan, ingested by hawk agent via `/api/ingest/research`).
- Added `DomainTag` to `tag-badge.tsx` with per-domain colors (product=blue, marketing=amber, ops=cyan, content=pink, strategy=violet). Replaced plain `type-badge` text with colored pills on all research surfaces.
- Added `AdminBreadcrumb` component using shadcn Breadcrumb primitives — used on research detail page, available for other admin pages.
- **Decision:** Research detail page uses a two-column CSS grid (`grid-cols-[1fr_14rem]`) for sidebar TOC instead of the single-column admin pattern. Falls back to single column on `< lg` screens. This is the only admin page with a sidebar — justified because research docs are 10-40KB and need navigation.
- **Decision:** Research list page groups by project, not flat chronological. Unassigned artifacts appear last. Groups sorted by most recent artifact (relies on DB `ORDER BY created_at DESC`).
- **Learned:** Moltzart's agents (hawk) run on a separate machine (Mac Mini M4 at `/Users/mmm4/`). Files saved there aren't accessible from this repo's machine. Research content must be POSTed via the ingest API or pushed to a shared git repo — local filesystem paths don't cross machines.
- **Learned:** `MarkdownRenderer` h2 id generation breaks with rich markdown headings (bold, links, code). `String(children)` on React element arrays produces `[object Object]`. Fixed with recursive `extractText()` helper. The `extractHeadings()` utility also needs `stripInlineMarkdown()` so TOC display text and slug generation match.
- **Watch:** The `extractHeadings` regex (`/^## (.+)$/`) only matches H2 at line start — headings inside code blocks or blockquotes could false-match. Not an issue with current research content but could surface with different markdown.
- **Next:** Domain tags are working. User mentioned "a couple things" but only stated #1 (domain badge styling) before ending session. Breadcrumb component exists but is only used on the research detail page — could be added to projects detail page and other drill-down pages.
- **Blocked:** Go-to-market plan file lives on Mac Mini (`~/.openclaw/workspace-marketing/go-to-market-plan.md`) — not in git. Moltzart needs to either ingest it via the API or push it to openclaw-home for access.

## 2026-02-23 (session 15)

- Built file-based blog: `gray-matter` + `src/lib/blog.ts`, `/blog/[slug]` static route with `MarkdownRenderer`, homepage "From my blog" section wired to real posts (date above title, no arrow icon).
- Moltzart self-published first post (`content/blog/accountability.md`) mid-session by pushing directly to repo — pulled his commit and deleted placeholder.
- **Decision:** Posts live as markdown files in `content/blog/[slug].md` with YAML frontmatter (`title`, `date`, `excerpt`). No DB, no admin UI. Static generation at build time. Simplest viable publishing mechanism.
- **Learned:** Moltzart immediately asked for write access to `content/blog/` and self-published before the session ended. He can clone, write, commit, push — full self-service. No handoff mechanism needed.
- **Watch:** `getPostBySlug` and `getAllPosts` use `fs.readFileSync` — only safe in Server Components and at build time. Never import `src/lib/blog.ts` into a client component or edge route.
- **Next:** Blog is live at `/blog/accountability`. No immediate follow-up needed — Moltzart owns publishing going forward.

## 2026-02-23 (session 14)

- Removed Radar entirely: deleted 7 files, removed all db functions/types, dropped `radar_items` table, cleaned admin sidebar + dashboard.
- Removed Engage entirely: same pattern — 7 files, all db functions/types, dropped `engage_items` table, sidebar + dashboard cleaned. Intelligence grid simplified to full-width NewsletterHighlights.
- Diagnosed and cleaned bad newsletter data: 6 articles ingested with wrong date (Feb 24) and stale category tags — deleted from DB. Patched missing link on "Technofascism Network Map" via direct SQL update.
- **Decision:** Radar and Engage both cut — high volume, low ROI, duplicated feeds already checked manually. Newsletter is now the sole input page. Simpler admin = faster to maintain.
- **Learned:** Pica's second scan ran at 21:01 UTC (4pm ET) but dated articles Feb 24 — her container is in UTC+3 or later, crossing midnight. Date computation must use ET (`America/New_York`), never the container's local clock. Also: the Gmail hook agent that ran at ~4pm had stale category instructions, explaining both the wrong timezone and the reverted tags in the same batch.
- **Watch:** Newsletter ingest accepts whatever `digest_date` Pica sends — no server-side validation against future dates. If Pica's timezone bug recurs, bad-dated articles will silently enter the DB again. Could add a `digest_date <= today (ET)` guard to the ingest route if it becomes a pattern.
- **Next:** Verify Pica's next newsletter scan comes in with correct ET date, proper pillar tags, and links on all articles. Moltzart updated Pica's AGENTS.md with all three fixes this session.

## 2026-02-21 (session 13)

- Added `GET /api/ingest/task` with optional `?status=` query param so Moltzart can list tasks programmatically. Returns full task objects sorted by `created_at DESC`. Added `fetchTasksByStatus()` to `db.ts`.
- **Why:** Moltzart had no way to get task IDs without scraping admin HTML. Now he can `GET ?status=in_progress`, match tasks to his TODO.md, and close them via the existing `PATCH /api/ingest/task/:id`.
- **Next:** Verify Moltzart's next run successfully lists and closes tasks via the new GET + existing PATCH flow.

## 2026-02-19 (session 12)

- Built full X Drafts pipeline: `x_drafts` table, `POST/GET /api/ingest/draft`, `PATCH /api/ingest/draft/:id`, `DELETE /api/admin/draft/:id`, `/admin/drafts/[week]` page with weekly view pattern, Drafts added to sidebar under Operations.
- Fixed tag layout violations in `radar-week-view.tsx` and `newsletter-view.tsx` — `LaneTag`/`PillarTag` were inline with title in `flex items-center` row. Now block layout: tag on own line, title below with `mt-1`.
- Removed lane filter strip from radar week view.
- Fixed task sort order: `in_progress → open → done` (was priority-only).
- Added `PATCH /api/ingest/task/:id` for partial task updates. Fixed critical bug in `updateTask`: was writing `null` for every unprovided field, causing 500s on partial PATCHes due to `title NOT NULL` constraint. Fixed with `COALESCE`.
- **Decision:** Drafts page follows the same weekly view pattern as radar/engage/newsletter — redirect to current week Monday, `[week]` dynamic route, `WeekSelector`, collapsible days. No one-off patterns.
- **Learned:** `updateTask` had always been broken for partial updates — it set every unspecified field to `null` unconditionally. The bug was invisible until Moltzart tried to PATCH only `{status: "done"}`. Any DB update function that accepts partial fields needs `COALESCE` or equivalent, not conditional ternaries that collapse to null.
- **Watch:** The same COALESCE pattern is needed anywhere a partial-update function exists. Check `updateXDraft` — it already uses COALESCE correctly. Tasks is now fixed. If new update functions are added, don't copy the old `updateTask` pattern.
- **Next:** Moltzart wiring up automatic task-closing via PATCH. Verify tasks appear as `done` in `/admin/tasks` after his next run. Also verify Pica's next newsletter scan sends correct pillar strings.

## 2026-02-19 (session 11)

- Consolidated lane/source tags into `src/components/admin/tag-badge.tsx` — single source of truth for `LaneTag`, `SourceTag`, `PillarTag`. Replaced shadcn `Badge` (plain gray) in radar dashboard card with colored `LaneTag`.
- Dashboard card UX pass: increased row padding (`py-2.5` → `py-4`), darkened dividers (`/20` → `/40`), made entire rows internal `<Link>` targets (radar→week, newsletter→week, engage→week). Removed all outbound external links from dashboard cards.
- Newsletter UI now shows content pillar tag (`PillarTag`) instead of source name. Three fixed pillars: `DESIGN + DEVELOPMENT` (pink), `TECH + INNOVATION` (violet), `WORK + MINDSET` (amber). `category` column and `NewsletterArticle.category` field already existed — just not wired to the display.
- Pica's freeform categories (`AI`, `Design`, `Tech`, `Business`, etc.) replaced with the three pillars in `workspace-content/AGENTS.md` by Moltzart.
- Governance: lifted `workspace-content/AGENTS.md` off-limits restriction (set in session 8, now stale). Added ownership table to `CLAUDE.md` here. Moltzart mirrored it in openclaw-home.
- **Decision:** Tags always stack above title on their own line — never inline/right-aligned. Uppercase on all tag variants enforced in the component.
- **Decision:** Dashboard cards link internally only. No external links from dashboard — navigate to the internal page first, then to the source if needed. Keeps the dashboard as a nav surface, not a content surface.
- **Decision:** `AGENTS.md` not created here — only one agent (Claude Code) operates in this repo, so `CLAUDE.md` is sufficient. `AGENTS.md` is for multi-agent repos.
- **Learned:** `category` was already in the DB schema and `NewsletterArticle` type from day one — Pica was sending it but with wrong values. Always check what's already plumbed before adding columns.
- **Watch:** Existing newsletter articles in DB have Pica's old freeform categories (`AI`, `Design`, etc.) — these will render with the gray fallback `PillarTag` color until Pica re-processes or a backfill SQL update is run. Not broken, just unstyled.
- **Next:** Verify Pica's next newsletter scan sends one of the three exact pillar strings. If gray tags still appear after her next run, check what she's actually sending via the DB (`SELECT category, count(*) FROM newsletter_articles GROUP BY category`).

## 2026-02-19 (session 9)
- **Newsletter week view:** Replaced flat newsletter page with Mon–Fri week-scoped view. `/admin/newsletter` now redirects to current week slug (e.g. `/admin/newsletter/2026-02-16`). Dynamic `[week]` route validates slug (must be a Monday), fetches only that week's articles from Neon, renders a week-selector dropdown in the header with previous-week navigation.
- **New files:** `src/lib/newsletter-weeks.ts` (pure date helpers), `src/components/week-selector.tsx` (client nav dropdown), `src/app/admin/newsletter/[week]/page.tsx` (dynamic route).
- **DB:** Added `fetchNewsletterWeek(start, end)` and `fetchNewsletterWeekStarts()` to `db.ts`. No schema changes.
- **Decision:** Slug is the raw Monday ISO date (`2026-02-16`) — no encoding, trivial to parse, stable and bookmarkable.
- **Learned:** `formatWeekLabel` needs to handle month-crossing weeks (e.g. "Feb 28–Mar 3, 2026") — caught by code reviewer before shipping.
- **Watch:** `WeekSelector` uncontrolled select edge case — if user navigates to a valid Monday with no articles while other weeks have data, the dropdown `value` won't match any option. Visually shows wrong week. Low-risk for solo use but worth cleaning up.
- **Next:** Verify week view looks correct in browser. Check that Pica's newsletter ingests on Feb 16–19 appear under the Feb 16–20 week.

## 2026-02-19 (session 10)
- **Newsletter UX refinements:** Most recent day now sorts first and opens by default. Other days collapsible. Hover-reveal trash icon deletes articles optimistically. Added `DELETE /api/admin/newsletter/[id]` endpoint and `deleteNewsletterArticle()` in db.ts. Added `id` field to `NewsletterArticle` interface.
- **Engage week view:** Applied identical structure to `/admin/engage` — week slug routing, collapsible days, delete button, priority tiers preserved within each day. `WeekSelector` now takes a `basePath` prop instead of hardcoding `/admin/newsletter`.
- **Decision:** `WeekSelector` made generic via `basePath` prop so it can serve both newsletter and engage (and any future week-scoped pages) without duplication.
- **Learned:** Ingest pipelines (`/api/ingest/*`) were completely untouched — only the admin display layer changed. Safe to refactor the view without touching Pica's endpoints.
- **Watch:** Dev server must be restarted when new route directories are added (e.g. `[week]/`) — Next.js hot reload doesn't pick up new filesystem routes automatically.
- **Next:** Verify engage week view in browser. Both newsletter and engage now share the same week-view pattern — if one needs a tweak, check if the other needs it too.

## 2026-02-17 (session 8)
- **Pica engage routing fix:** Pica (Haiku) was sending X engagement briefings to Telegram instead of POSTing to `/api/ingest/engage`. The moltzart endpoint and `/admin/engage` page were already working — problem was entirely in Pica's instructions in openclaw-home.
- **Root cause:** Morning X Scan procedure was structured as "curate a briefing" with the API call as step 5 of 8 — Haiku defaulted to the Telegram output pattern. A competing remote commit had also reverted X scan routing to `/api/ingest/radar` and re-added dead endpoints (`/angles`, `/feedback`, `/research-request`).
- **Fix (workspace-content/AGENTS.md):** Added Output Routing table (non-negotiable) with explicit scan→endpoint mapping. Rewrote Morning X Scan as API-first procedure with curl template, priority assignment, and response verification. Removed stale endpoints. Restored engage quality rules. Fixed newsletter cross-posting to radar.
- **Decision:** Structural instructions beat prohibitions for smaller models — "build JSON and POST" works better than "don't send to Telegram" when the procedure already reads like a briefing task.
- **Decision:** Added `workspace-content/AGENTS.md` to Moltzart's off-limits list (same pattern as moltzart.com repo). File describes API endpoints that depend on moltzart.com codebase — Moltzart editing from stale memory caused routing regressions. Changes go through Matt now.
- **Learned:** Moltzart's competing commit had reverted session 4-6 decisions (re-added `/angles`, `/feedback`, `/research-request` endpoints, routed X scan to radar). Agents with fresh-session memory will "fix" files based on stale understanding unless explicitly told not to touch them.
- **Watch:** Merge conflicts in openclaw-home — the workspace-sync cron and Moltzart both push to main. When pulling, always use `--rebase` and check the conflict carefully. The remote version may contain regressions disguised as improvements.
- **Next:** Verify Pica's next morning X scan (Feb 18, 8 AM ET) lands in `/admin/engage` instead of Telegram. If it still goes to Telegram, the issue is in the cron job prompt, not the instruction file.

## 2026-02-16 (session 7)
- **Newsletter link fix:** Pica was sending root domain URLs (e.g. `https://theverge.com`) as article links instead of full article URLs. Added validation to `/api/ingest/newsletter` that rejects bare domain links. Updated openclaw-home AGENTS.md with explicit instruction. Nulled 11 bad links in DB.
- **Newsletter upsert:** Added `UNIQUE (digest_date, title)` constraint and `ON CONFLICT DO UPDATE` so Pica can re-process newsletter emails without creating duplicates. Existing fields preserved via COALESCE.
- **Newsletter view:** Articles without links now render as non-clickable (no ExternalLink icon) instead of linking to `null`.
- **Next:** Pica re-processing all newsletter emails with correct article URLs. Verify data after she completes.

## 2026-02-16 (session 6)
- **Admin page taxonomy cleanup:** Removed Drafts and Research features entirely — deleted pages, API routes, components, DB functions, and dropped 3 Neon tables (`drafts`, `research_requests`, `research_docs`).
- **Engage page simplified:** Removed HN highlight type from engage system. Engage is now reply-targets-only (X engagement briefing for @mattdowney). Stripped type filter toggle and HN section from `engage-view.tsx`.
- **Radar data cleanup:** Deleted misplaced `Newsletters` and `X Timeline` rows from `radar_items` — those content types now route to their proper pages.
- **Dashboard updated:** Replaced Content Ideas and Research stat cards with Engage and Newsletter. Action queue now shows urgent tasks only (no more draft/research items). Removed Recent Research grid.
- **Sidebar restructured:** Dashboard, Inputs (Radar, Engage, Newsletter), Operations (Tasks). Removed Outputs group entirely.
- **openclaw-home updated:** Added engage endpoint to AGENTS.md Data Layer section, removed draft/research endpoints, added routing rules. Updated Pica delegation in STANDING-ORDERS.md with 3 output streams. Paused X Draft Review (Moltzart no longer tweets).
- **Decision:** Newsletter moved from Outputs to Inputs — it's curated content Pica finds for Matt to pick from, not Matt's output.
- **Pica routing fix:** Updated `workspace-content/AGENTS.md` — Morning X Scan now posts to `/api/ingest/engage` instead of radar. Removed stale endpoints (angles, feedback, research-request). Added explicit rule: no Telegram for scan results, API only.
- **Cross-project dependency:** Added "Agent Dependency" section to moltzart CLAUDE.md noting which openclaw-home files reference ingest endpoints. Added launchd workspace-sync job on Mac Mini (every 5 min `git pull --ff-only`) so Moltzart sees external edits without burning tokens.
- **Decision:** System-level cron for workspace sync beats agent-level `git pull` in boot sequence — zero token cost, always current.
- **Engage priority redesign:** Replaced opaque number badges with grouped priority tiers — "Top Picks" (teal left border), "Worth Engaging", "Also Noted". Grouping communicates priority through position and labels.
- **Engage dedup:** Added `tweet_url`-based dedup to `insertEngageItems` — Pica's scan posted duplicates across two API calls. Also added "one tweet per topic" quality rule to Pica's instructions to prevent topical overlap.
- **Pica scan verified end-to-end:** Pica populated 11 reply targets on `/admin/engage` via the new ingest endpoint. Full pipeline working: X scan → `/api/ingest/engage` → engage page with priority tiers.

## 2026-02-15 (session 5)
- Admin UI/UX cleanup: unified card pattern across all pages — bordered container + header row with icon/title/count. Removed `max-w-4xl` constraints, all pages now full width. Deleted unused `PageHeader` component.
- **Decision:** Grouped sidebar nav by workflow stage: Inputs (Radar, Research), Outputs (Content Ideas, Newsletter), Operations (Tasks).
- **Decision:** Teal accent color (matching avatar) applied to sidebar active state, card header icons, header action links, radar date pills. Updated CLAUDE.md and CSS variables.
- No agent-facing changes — all API endpoints and ingest routes unchanged.

## 2026-02-15 (session 4)
- Completed GitHub → Neon migration: tasks and research docs now read from Neon. Rewrote `tasks-view.tsx` as flat priority-sorted list (dropped section grouping + recurring). Created `tasks` and `research_docs` tables, added `/api/ingest/task` and `/api/ingest/research-doc` endpoints. Deleted `src/lib/github.ts` entirely — no more GitHub API dependency. Net: +496 lines, -1,841 lines.
- **Decision:** Removed content feedback and newsletter angles features. Both tables had zero rows — Pica never populated them despite audit fixes. Dropped tables from Neon, removed DB functions, deleted ingest routes, removed signals sidebar from dashboard, deleted `signals-panel.tsx`.
- Updated `openclaw-home` repo (AGENTS.md, TOOLS.md, STANDING-ORDERS.md): removed all references to `/api/ingest/feedback` and `/api/ingest/angles`, removed Content Preference Logging and Consolidation standing orders, added `/task` and `/research-doc` to endpoint docs.

## 2026-02-15 (session 3)
- Dashboard redesign: rewrote `/admin/page.tsx` as 5-zone intelligence hub — metrics strip (4 stat tiles), action queue (urgent tasks + pending drafts + research requests), radar highlights, signals/angles sidebar, recent research grid. Removed `max-w-4xl` constraint to use full width.
- Added 3 new DB functions (`fetchRecentFeedback`, `fetchRecentAngles`, `fetchOpenResearchRequests`) + interfaces. Created 3 new components in `src/components/dashboard/`.
- Drafts pivot: renamed "Drafts" → "Content Ideas" in sidebar, drafts page title, and dashboard. Updated X link from `@moltzart` → `@mattdowney`.
- **Decision:** Wiped all DB data and dropped `radar_clusters` table. Migration from GitHub markdown had broken data — `why_bullets` empty (regex matched `- Why:` but markdown says `- Why Matt cares:`), cluster fields all null. Ingest API pipeline verified correct for all 5 endpoints; Pica's next scans will produce clean data.
- **Decision:** Clusters concept removed entirely — no ingest endpoint existed, Pica had no instructions to post them. Can revisit later if needed.

## 2026-02-15 (session 2)
- Fixed production crash on `/admin/radar` — Neon serverless driver returns `DATE` columns as JS Date objects, not strings. Code calling `.slice(0, 10)` threw `TypeError`. Added `toDateStr()` helper in `db.ts` and normalized all 6 fetch functions.
- This was the last bug from the GitHub → Neon data migration (completed earlier this session: schema, 6 ingest API routes, read path migration, data backfill, agent instruction updates across 7 files in openclaw-home).

## 2026-02-15
- Pica agent audit: diagnosed 6 systemic issues — 2 crons likely unregistered (8 AM X Scan, Wednesday Newsletter Reminder), content-feedback.jsonl being skipped by Haiku on most sessions, no research request mechanism, newsletter-angles never produced, broken newsletter sources. Moltzart applied all 6 fixes on Mac Mini.
- Fixed radar parser bug in `src/lib/github.ts` — `---` separators in content-radar markdown were flushing the current section, causing items after the separator to render as title-only. Now `---` lines are skipped without breaking section state.
- **Decision:** All Pica output to content-radar files must use v3 radar format, no exceptions — including research responses and one-off requests. Format enforcement added to Pica's AGENTS.md by Moltzart.
- Updated git remote from `moltzart/moltzart.com` to `mattdowney/moltzart.com` (GitHub repo transfer).

## 2026-02-14 (session 3)
- Markdown schema redesign: added YAML frontmatter + structured formats for all 5 file types (drafts, tasks, radar, newsletter, research). Parsers in `github.ts` support both old and new formats.
- Created `docs/project/MARKDOWN-SCHEMAS.md` (contract doc), `scripts/migrate-radar.ts` (one-time migration), and pushed `FORMAT-SPECS.md` to openclaw-home for agent reference.
- Ran radar migration — 2 files got frontmatter added (both already v3 body). Moltzart migrated `TODO.md` and `x-drafts.md` to new formats and instructed Pica.
- **Decision:** Moltzart owns `research/*.md` docs. Pica owns content-radar and newsletter-digest output. All agents reference `FORMAT-SPECS.md` for output formats.
- Merged `admin-ui-overhaul` branch to main (fast-forward), deleted branch. Deploying via Vercel from main.

## 2026-02-14 (session 2)
- Added `CLAUDE.md` with project context: stack, structure, commands, conventions, deployment rules
- Fixed admin login for local dev — `secure: true` on the auth cookie blocked it on HTTP localhost; now conditional on `NODE_ENV === "production"`
- Set up local dev environment: `TASKS_PASSWORD` and `GITHUB_TOKEN` needed in `.env.local` (pull from Vercel production or add manually)
- **Decision:** Architecture confirmed — `openclaw-home` repo is the data layer (agents write markdown), `moltzart.com` reads via GitHub API at runtime. No content files in this repo.

## 2026-02-14
- Recovered `/admin/radar` feature from Vercel deployment — code was live in production but never committed to git. Added 3 new files (page, API route, client component) and modified sidebar + github.ts
- **Decision:** GitHub is the sole source of truth. Added "Deployment Integrity" rules to global CLAUDE.md — all code must be committed/pushed before deploy, every session must end with clean git status
- **Decision:** moltzart and pica agents are now prohibited from committing to moltzart.com repo — only human commits going forward (enforced in AGENTS.md on their side)

## 2026-02-23 (session 16)
- Refined blog page typography/details: markdown links now match homepage inline style, text-link underlines disappear on hover, post sign-off (after `---`) is darker, slug page divider color matches markdown `hr`, and `← Back` capitalization updated.
- Implemented dynamic Open Graph image generation with shared renderer + route-level OG endpoints (`/opengraph-image`, `/blog/[slug]/opengraph-image`, `/dashboard/opengraph-image`, `/tasks/opengraph-image`) and wired metadata/Twitter cards to `summary_large_image`.
- **Decision:** Standardize public tagline to exactly `AI finding its voice` across visible UI and metadata. OG cards now use a consistent 60/40 layout with the profile image on the right, no avatar ring, and top header text `@moltzart AI finding its voice` (badge removed).
- **Next:** Let deployment propagate, then re-scrape key URLs in X card preview tools to refresh cached previews and confirm final OG composition in production.

## 2026-02-25
- Added Products system end-to-end: new admin sidebar section, `/admin/products` list, `/admin/products/[slug]` detail page, and ingest routes `POST/GET /api/ingest/product` + `PATCH /api/ingest/product/:id` with status/source validation and slug collision handling.
- Created and applied Neon migration for `product_ideas` + `product_research_items` (with constraints/indexes) on project `weathered-violet-97076872` / database `neondb`; verified both tables and indexes exist.
- **Decision:** Standardized product lifecycle/status enum to `idea`, `researching`, `building`, `launched`, `archived` and research source enum to `note`, `article`, `competitor`, `user_feedback`, `market_data` for both API validation and UI grouping.
- **Next:** Moltzart can now retry ingestion against production (`/api/ingest/product`); smoke check is unauthenticated GET returning `401`, then POST both product ideas with associated research.

## 2026-02-25
- Rolled out semantic typography + markdown readability updates across admin and public surfaces: compact badge token, markdown prose styling, and cleaner product detail/research toggles (validation docs, planning docs, build considerations).
- **Decision:** Product detail pages are now structured as idea-workspace surfaces (foundation + grouped research toggles), not a flat ongoing research feed.
- **Decision:** Homepage/blog listing metadata is now consistent and minimal: centered homepage layout restored, section labels use small uppercase dark styling, and blog list is title-only (no date, no excerpt).
- **Next:** Do a visual QA pass in browser at mobile + desktop breakpoints for `/`, `/blog/[slug]`, `/admin/products`, and `/admin/products/[slug]` to tune any remaining perceived size/spacing issues.

## 2026-02-25
- Fixed two production build blockers after deployment failures: added missing product research helper exports in `src/lib/products.ts` and added optional `className` support to `MarkdownRenderer` so product detail markdown usage type-checks in CI.
- **Decision:** Keep the current UI work (dashboard/products typography/layout updates) and patch compile/deploy breakages surgically instead of reverting feature commits.
- Published all pending local UI/typography edits in one build-verified sync commit (`bfd7196`) after successful local `npm run build`, then pushed to `main` for Vercel deploy.
- **Next:** Continue visual QA in production for `/admin`, `/admin/products`, and `/admin/products/[slug]` to confirm style parity with local after cache propagation.

## 2026-03-03
- Introduced a project-first domain (projects table, fallback to old products when migration is missing) so `/admin/projects` no longer shows an empty board; backend now links research artifacts and product ideas through `project_id`. **Decision:** keep `/admin/products` as a legacy view while projects become the primary entry point.
- Added project ingestion (`/api/ingest/project`) and detailed project pages (`/admin/projects/[slug]`), plus research artifacts now record `project_id` and surface the linked project from `/admin/research/[id]`.
- Prepared the new migration `scripts/migrations/20260303_projects_first_model.sql` and the supporting code changes (DB layer, sidebar, project view component) but left the migration unapplied in production pending your approval; lint/build pass except for the pre-existing spacing-grid violation in `markdown-renderer.tsx`.
- Fixed `/admin/tasks` runtime crash (`a.created_at.localeCompare is not a function`) by normalizing task timestamps to strings at the DB mapping boundary in `src/lib/db.ts` (`created_at`, `updated_at`).
- Added a defensive timestamp comparator in `src/components/tasks-view.tsx` so task sorting remains safe even if a `Date` slips into client state.
- **Decision:** Treat Neon datetime coercion at the data boundary as canonical (normalize once in `db.ts`) and keep UI sort logic resilient as a guardrail.
- **Next:** Smoke check `/admin/tasks` drag/sort behavior in browser and confirm no further Date-vs-string errors after refresh.

## 2026-03-05
- Rebuilt the styleguide spacing page around an actual app-spacing model: 4px grid scale, vertical rhythm, horizontal grouping, inset/density guidance, and shared `PanelHeader` usage instead of ad hoc card title treatments. Also widened the shared admin content width from `max-w-[960px]` to `max-w-[1080px]`.
- Added shared `CodeToken` for mono inline code references and swept the styleguide pages so utilities, component names, and prop/value snippets render consistently in `font-mono`.
- Replaced the motion page with clearer, opinionated demos tied to `docs/project/design-guidelines.md`: duration scale, directional easing, origin-aware pop-in vs bad reference, sequential hand-off, staggered batch entry, and explicit repo motion rules.
- **Decision:** `PanelHeader` is the canonical admin card header. Styleguide examples and real admin surfaces should compose on it instead of inventing page-local header bars.
- **Decision:** Motion demos must explain what changed and what to look for. If a demo is technically animating but not legible on first read, it fails the page.
- **Next:** Do a browser QA pass on `/admin/styleguide/spacing` and `/admin/styleguide/motion` to tune visual density, copy clarity, and whether any demo still feels ambiguous in practice.
- Added a dedicated `/admin/styleguide/navigation` page, then tightened it hard: tabs now document real rail sizes (`28 / 32 / 36`), compact trigger sizing, overflow behavior, and shared-indicator motion instead of oversized static tab examples.
- **Decision:** Navigation rails should use a shared moving indicator with restrained spring motion and sequential content hand-off beneath the rail. Tabs are orientation, not buttons; they should not inherit button-like press language.
- Extracted `src/components/admin/summary-card.tsx` from the navigation motion demo and reused it on the cards styleguide page as a named “Summary card” pattern with stronger contrast (`bg-zinc-950/70`, clearer border) so the contained surface reads cleanly inside a panel.
- **Next:** Browser-QA `/admin/styleguide/navigation` and `/admin/styleguide/cards` for scanability, especially whether the summary card contrast is now sufficient and whether any remaining comparison sections still show too many variants at once.
- Added explicit icon sizing/spacing guidance to the Buttons styleguide page: default inline icons are `14px`, small utility icons `12px`, with `6px` default icon/text gap and `8px` as the hard ceiling. Navigation notes now point back to Buttons as the canonical icon rule source.
- Split the oversized navigation styleguide route into `navigation-data.ts`, `navigation-demos.tsx`, and a thin `page.tsx` so Fast Refresh invalidates smaller modules instead of recompiling one 700+ line client page.
- **Decision:** Admin and styleguide sidebars should not use automatic `next/link` prefetch. The visible nav lists were triggering cold compile work for sibling pages and slowing the design loop before the user even clicked.
- **Next:** Verify the dev loop after the sidebar prefetch change. If route changes still feel sticky, measure whether the remaining lag is only cold-start compilation or whether other visible `Link` clusters need the same treatment.

## 2026-03-05
- Attempted an admin/styleguide alignment pass focused on shared primitives and internal tool surfaces: added `AuthShell` + `CollapsiblePanel`, moved `/tasks`, `tasks-view`, drafts/newsletter groupings, research groups, and several grouped list pages onto the newer admin primitives, then widened the admin shell and introduced summary-card-based top rows for projects/products/research.
- **Decision:** Stop this direction. The work improved structural consistency but did not produce the visual/layout quality needed; swapping primitives without a stronger page-composition model still leaves the app feeling flat and generic.
- **Decision:** The styleguide remains the source of truth, but the next pass must start from page archetypes and layout composition, not from incremental primitive substitution.
- **Next:** Reassess the admin layout and key page archetypes (`tasks`, grouped review pages, detail workspace pages) before continuing implementation. Do not continue broad sweeps until the layout model is clarified.

## 2026-03-06
- Reworked the admin around page archetypes instead of repeated `PageHeader + SummaryCard + Panel` stacks. Added shared primitives for intros, metric strips, section tabs, collection panels, and right-side context rails, then wired them into the admin shell.
- Redesigned the main admin surfaces: `Research` now has `By Project / Unassigned / Recent` library modes, `Projects` and `Products` now read as lifecycle pipelines, `Dashboard` is organized into `Now / Watch / Latest`, `Tasks` is framed as an operational workbench, and weekly review pages now read as bounded review batches instead of generic accordions.
- Rebuilt detail layouts for research, project, and product pages so content stays primary and metadata/source context moves into a sticky side rail instead of interrupting the main reading flow.
- **Decision:** The admin redesign should be driven by page intent and hierarchy first. Shared components only matter when they reinforce distinct page models like library, pipeline, workbench, weekly review, and document detail.
- **Next:** Do a browser QA pass across the redesigned admin pages at mobile and desktop breakpoints, then decide whether to keep iterating page-by-page or do a focused cleanup pass on spacing/visual contrast. Repo-wide `npm run lint` still has pre-existing spacing-rule failures in shared UI files like `button.tsx` and `tabs.tsx`; the redesigned files themselves are ESLint-clean and `npm run build` passes.

## 2026-03-06
- Reworked the dashboard into a clearer landing page: summary cards on top, a task-driven action queue as the primary surface, and a narrower support rail for health/intake. Removed the self-explanatory `How To Use This` card and tightened the quiet-state behavior when the queue is empty.
- Consolidated admin card surfaces into shared primitives: one radius, shared surface variants, shared card-copy tokens, and a canonical icon-tile pattern now used by summary cards and resolved-status states. Updated the cards and typography styleguide pages to document those rules explicitly.
- Refined shared header and empty-state behavior so spacing and card-copy rhythm hold consistently across page headers, summary cards, panels, rails, and queue-clear states. The queue-clear state is now left-aligned and uses the shared icon treatment rather than a one-off centered success card.
- **Decision:** Dashboard action queue remains task-only for now. It surfaces unfinished tasks that are blocked, urgent, or `todo`; if the queue broadens later, that should be a deliberate “attention queue” product decision, not an ad hoc mix of unrelated inputs.
- **Decision:** Good admin UI should not explain itself with instructional cards. If a dashboard needs a “how to use this” block, the hierarchy is still wrong.
- **Next:** Browser-QA the dashboard after the latest empty-state and typography cleanup, then audit remaining admin views for raw card wrappers or copy/layout drift that still bypass the shared surface, icon, and card-content primitives.

## 2026-03-06
- Fixed the calendar data path and UI behavior end-to-end: reconciled OpenClaw cron telemetry with schedule-synced jobs, stopped false missed-state rendering, tightened the top rail/legend layout, improved column scrolling and sticky headers, and clarified agent ownership/always-on labels.
- Reworked the tasks surface: removed the backlog lane from the board, rebuilt the task drawer around clearer status/blocker hierarchy, standardized UI dates through a shared `MM-DD-YY` formatter, renamed dependency language from `Blocked` to `Waiting`, and aligned waiting status color/pulse treatment across dashboard and task views.
- Removed task priority as an active product concept from UI, APIs, and DB helpers, and added a migration file to drop `tasks.priority` from the schema (`scripts/migrations/20260306_drop_tasks_priority.sql`).
- **Decision:** Dependency state should read as `Waiting` / `Waiting On`, not `Blocked`, and it should use one consistent orange/pulsing treatment instead of mixing urgent-red and dependency-orange cues.
- **Next:** Apply the `DROP COLUMN priority` migration in Neon after approval, then do a browser QA pass on the updated calendar/task/dashboard flows to catch any remaining copy or spacing drift.
