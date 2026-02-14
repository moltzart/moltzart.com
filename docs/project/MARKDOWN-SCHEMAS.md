# Markdown Schemas

Contract between agents (writing to `openclaw-home`) and the admin UI (reading via GitHub API).

All files use YAML frontmatter with a `format` version key. Parsers detect frontmatter and branch accordingly; files without frontmatter fall back to legacy parsing.

---

## 1. Drafts (`memory/x-drafts.md`)

**Format key:** `drafts-v2`

```markdown
---
format: drafts-v2
updated: 2026-02-14T15:00:00Z
---

## Pending Approval

### 2026-02-14 14:32 | Original
- priority: high
> Draft content here.
>
> Second paragraph of draft.

### 2026-02-14 09:15 | Reply to @username
- priority: normal
- context: They asked about AI agents and tooling
> Reply content here.

_Feedback: tone feels too formal_

## Approved

### 2026-02-13 11:00 | Original
- priority: normal
> Approved draft content.

## Posted

### 2026-02-12 08:30 | Original
- priority: normal
- tweet-id: 1234567890
> Posted content.

## Rejected

### 2026-02-11 16:45 | Reply to @someone
- priority: low
- context: Discussion about design systems
> Rejected draft content.

_Feedback: too niche for our audience_
```

### Rules
- **Section headers** (`## Pending Approval`, `## Approved`, `## Posted`, `## Rejected`) determine status
- **Entry headers** use `### YYYY-MM-DD HH:MM | Type` where type is `Original` or `Reply to @handle`
- **Metadata** as `- key: value` lines below the heading: `priority`, `context`, `tweet-id`
- **Content** in blockquote lines (`> ...`), blank `>` lines separate paragraphs
- **Feedback** as italic lines prefixed with `_Feedback: ..._`
- **priority** values: `high`, `normal`, `low`

---

## 2. Tasks (`TODO.md`)

**Format key:** `tasks-v2`

```markdown
---
format: tasks-v2
updated: 2026-02-14T15:00:00Z
---

## 🔴 URGENT (needs immediate attention)

- [ ] Fix the broken pipeline — Details about the issue
  - due: 2026-02-20
  - effort: M

- [x] Deploy hotfix
  - due: 2026-02-15
  - effort: S

## 🟡 ACTIVE (in progress)

- [~] Review security audit — Waiting on external report
  - effort: L
  - blocked-by: Fix the broken pipeline

## 🔁 RECURRING

| Task | Schedule | Method |
|------|----------|--------|
| Daily content radar | Daily 6 AM | Automated |
```

### Rules
- **Section headers** (`## ...URGENT...`, `## ...ACTIVE...`, etc.) — parser matches keyword
- **Tasks** as checkbox lines: `- [ ]` (open), `- [x]` (done), `- [~]` (partial)
- **Detail** separated by ` — ` (em-dash) after task text
- **Metadata** as indented sub-items: `  - due:`, `  - effort:`, `  - blocked-by:`
- **effort** values: `S`, `M`, `L`, `XL`
- **Recurring** section uses a markdown table (unchanged from v1)

---

## 3. Content Radar (`memory/content-radar-YYYY-MM-DD.md`)

**Format key:** `radar-v3`

```markdown
---
format: radar-v3
date: 2026-02-14
scan_sources: [HN, X, Reddit, Blogs]
item_count: 12
---

## Hacker News

### Claude Code ships background agents
- Source: Hacker News — https://news.ycombinator.com/item?id=12345
- Lane: AI
- Why:
  - Direct competitor feature to what we're building
  - Shows market direction for agentic coding tools

## Topic Clusters

**Agentic AI** — 4 items across HN, X, Blogs
**Design Systems** — 2 items from CSS, Design
```

### Rules
- **`## Source`** headings group items by source
- **`### Title`** per item
- **`- Source:`** with name + URL separated by ` — `
- **`- Lane:`** topic/category tag
- **`- Why:`** followed by indented bullet list
- **`## Topic Clusters`** at end — bold cluster names with summary

---

## 4. Newsletter Digest (`memory/newsletter-digest-YYYY-MM-DD.md`)

**Format key:** `newsletter-v2`

```markdown
---
format: newsletter-v2
date: 2026-02-14
article_count: 8
---

### Title of Article
- source: The Verge
- link: https://theverge.com/article
- category: AI
Description of why this article matters and what it covers.

### Another Article Title
- source: Hacker News
- link: https://news.ycombinator.com/item?id=123
- category: Tech
Description text here.
```

### Rules
- **`### Title`** per article
- **Metadata** as `- key: value`: `source`, `link`, `category`
- **Description** as body text after metadata (supports multi-line markdown)
- **category** enables UI filtering (values: `AI`, `Tech`, `Design`, `Business`, etc.)

---

## 5. Research (`research/*.md`)

**Format key:** `research-v2`

```markdown
---
format: research-v2
title: Research Title
tags: [ai-agents, tooling, claude]
status: published
created: 2026-02-14
---

# Research Title

Content starts here...
```

### Rules
- **`title`** — display title (avoids slug-to-title conversion)
- **`tags`** — array for filtering and related-doc suggestions
- **`status`** — `draft`, `published`, or `archived`
- **`created`** — ISO date, eliminates git commit API lookups
- Body content starts after frontmatter, typically with `# Title` heading
