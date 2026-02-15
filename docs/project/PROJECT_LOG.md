# Project Log

## 2026-02-15 (session 5)
- Admin UI/UX cleanup: unified card pattern across all pages (Tasks, Content Ideas, Newsletter, Radar, Research). Each section now uses bordered container + header row with icon, title, and count — matching the dashboard's Radar Highlights card.
- Removed `max-w-4xl` constraints from all admin pages — cards now go full width like the dashboard.
- Grouped sidebar nav by workflow stage: Inputs (Radar, Research), Outputs (Content Ideas, Newsletter), Operations (Tasks). Uses `SidebarGroup` + `SidebarGroupLabel` for visual separators.
- Added teal accent color to match Moltzart avatar. Applied to: sidebar active state (CSS variables), card header icons, header action links, radar active date pills.
- Removed `PageHeader` component usage from all pages (component file still exists but unused).
- Fixed radar highlights "—" showing next to "Today's Radar" when no scan data exists.
- No agent-facing changes — all API endpoints, schemas, and ingest routes unchanged.

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
