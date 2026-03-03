# Research UI Design

Date: 2026-03-03

## Context

Moltzart's research pipeline produces long-form markdown documents (10-42KB each) tied to projects. The first batch is 6 documents for the bookyour.hair project covering PRD, cost analysis, market research, naming, micro-SaaS opportunities, and SWOT analyses. These live in openclaw-home and get ingested into the `research_artifacts` table via `POST /api/ingest/research`.

The admin UI at `/admin/research` needs to serve three use cases in priority order:
1. Full reading of research documents
2. Status tracking across projects
3. Reference lookup (find a specific finding)

## Design Decisions

- **Long scroll with collapsible TOC** for the detail page. Pure long scroll loses orientation in 40KB docs. Sectioned/collapsible views break reading flow. A TOC strip at the top preserves the single-column admin layout while solving navigation.
- **Grouped by project** on the list page. Flat chronological lists become unusable at 20+ artifacts. Project grouping matches the mental model (research belongs to a project) and supports the status tracking use case.
- **Minimal header on detail page.** Full reading is the primary use case — strip metadata chrome and get to the content. Source links move to the bottom (referenced after reading, not before).
- **No sidebar TOC.** Would break the single-column admin pattern used on every other admin page. The collapsible TOC strip achieves the same goal within the existing layout.

## Detail Page (`/admin/research/[id]`)

Top to bottom:

1. **Back link** — `← Back to research` (existing pattern)
2. **Header**
   - Line 1: Domain badge + project link (teal text, links to `/admin/projects/[slug]`)
   - Line 2: Title as `type-h2 text-zinc-100`
   - Line 3: Date in `text-zinc-600`
3. **Collapsible TOC strip**
   - Panel with "On this page" label + chevron toggle
   - Lists all H2 headings as teal anchor links
   - Collapsed by default if < 3 H2 headings, expanded if >= 3
   - Smooth-scrolls to target section on click
4. **Document body**
   - Full markdown in a single Panel via `MarkdownRenderer`
   - H2 elements get `id` attributes matching TOC anchors
   - Long scroll, no pagination, no collapsing
5. **Source links**
   - Panel at the bottom (moved from current position above body)
   - Same pattern as current: list of external links with ExternalLink icon

### What changes from current detail page

- Remove from header: status badge, author badge, task ID badge, product link badge
- Add: collapsible TOC strip between header and body
- Move: source links from above body to below body
- Add: `id` attributes on H2 headings in MarkdownRenderer

## List Page (`/admin/research`)

Top to bottom:

1. **Page header** — Existing Panel with FileSearch icon, "Research" title, artifact count. No changes.
2. **Project groups** — Collapsible sections (existing UI pattern from `UI-GUIDELINES.md`)
   - Section header: project title + artifact count
   - Sorted by most recent artifact in the group (newest first)
   - Expanded by default
3. **Artifact rows** — Link to detail page
   - Title (primary text, `text-zinc-200`)
   - Domain badge (right-aligned, `type-badge`)
   - Summary below title (`line-clamp-1`, `text-zinc-500`)
   - ChevronRight on hover (existing pattern)
4. **Unassigned section** — Artifacts with no `project_id`, same collapsible pattern, appears last

### What changes from current list page

- Remove from rows: status badge, author, date (visible on detail page)
- Add: project grouping with collapsible headers
- Simplify rows to: title + domain + summary

## TOC Component

**Heading extraction utility** (`extractHeadings`):
- Parses `body_md` for lines starting with `## ` (H2 only)
- Returns `Array<{ id: string, text: string }>`
- `id` is slugified heading text (lowercase, hyphens, no special chars)
- Runs server-side in the page component

**MarkdownRenderer change**:
- Add `generateIds?: boolean` prop
- When true, H2 elements render with matching `id` attributes

**TOC client component** (`ResearchToc`):
- Receives `headings` array as prop
- Panel with "On this page" + chevron toggle (standard collapsible pattern)
- Each heading renders as a teal anchor link
- Click handler: `document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })`
- Auto-expand: `headings.length >= 3`

## Project Cross-Navigation

**From research → project**: Project link in detail page header links to `/admin/projects/[slug]`.

**From project → research**: Add a "Research" section to `/admin/projects/[slug]` that lists linked artifacts. Same row pattern as research list page (title + domain + summary), linking to `/admin/research/[id]`. Requires a `fetchResearchArtifactsByProjectId` query.

## New/Modified Files

| File | Change |
|------|--------|
| `src/app/admin/research/page.tsx` | Rewrite: grouped by project layout |
| `src/app/admin/research/[id]/page.tsx` | Rewrite: minimal header, TOC, source links at bottom |
| `src/components/admin/research-toc.tsx` | New: collapsible TOC client component |
| `src/lib/research-headings.ts` | New: `extractHeadings()` utility |
| `src/components/admin/markdown-renderer.tsx` | Modify: add `generateIds` prop |
| `src/lib/db.ts` | Add: `fetchResearchArtifactsByProjectId()` query |
| `src/app/admin/projects/[slug]/page.tsx` | Add: research section with linked artifacts |

## Not In Scope

- Ingesting the openclaw-home research files (Moltzart's responsibility)
- Search/filter on the list page (can add later if needed)
- Edit/delete research from the admin UI (ingest API handles lifecycle)
- Mobile-specific layout changes (admin is desktop-primary)
