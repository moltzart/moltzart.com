# Project Log

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
