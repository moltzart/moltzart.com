# UI Guidelines — moltzart.com

Comprehensive design system reference for moltzart.com — dark-only, zinc-based, practical not perfect.

**Stack:** Next.js 16 (App Router, RSC) · TypeScript 5.9 · Tailwind CSS v4 (CSS-first config) · shadcn/ui (new-york style, zinc base) · Geist Sans + Geist Mono · Lucide React · Vercel

---

## Table of Contents

1. [Color System](#1-color-system)
2. [Typography](#2-typography)
3. [Spacing & Layout](#3-spacing--layout)
4. [Border Radius](#4-border-radius)
5. [Borders & Shadows](#5-borders--shadows)
6. [Animation & Motion](#6-animation--motion)
7. [Icon System](#7-icon-system)
8. [Component Catalog](#8-component-catalog)
9. [State Patterns](#9-state-patterns)
10. [Accessibility](#10-accessibility)
11. [Pattern Checklist](#11-pattern-checklist)
12. [Common Mistakes](#12-common-mistakes)

---

## Philosophy

- **Consistency over novelty** — patterns should be predictable; resist one-off solutions
- **Performance first** — fast animations, GPU-accelerated properties only (`transform`, `opacity`)
- **Accessibility** — hover states, focus rings, and semantic HTML are non-negotiable
- **Practical not perfect** — ship working UI and iterate; don't block on polish

---

## 1. Color System

### Background & Surface

| Token | Value | Tailwind Class | Usage |
|---|---|---|---|
| `--background` | `oklch(0.141 0.005 285.823)` | `bg-zinc-950` | Page background |
| `--card` | `oklch(0.21 0.006 285.885)` | `bg-zinc-900` | Elevated surface (Panel component) |
| `--muted` | `oklch(0.274 0.006 286.033)` | `bg-zinc-800` | Subtle backgrounds, hover states |

**Opacity variants used in practice:**

| Class | Usage |
|---|---|
| `bg-zinc-900/30` | Card background (standard) |
| `bg-zinc-800/40` | Hover state background |
| `bg-zinc-800/60` | Panel component background |

### Text Hierarchy

| Class | Equivalent | Usage |
|---|---|---|
| `text-zinc-100` | `--foreground` | Headings, primary text, strong emphasis |
| `text-zinc-200` | — | Body text |
| `text-zinc-300` | — | De-emphasized body, prose content |
| `text-zinc-400` | — | Muted text, secondary labels |
| `text-zinc-500` | `--muted-foreground` | Labels, meta text, section headers |
| `text-zinc-600` | — | Very subtle text, timestamps, placeholders |

### Borders

| Pattern | Usage |
|---|---|
| `border-zinc-800/50` | Standard card/component border |
| `border-zinc-800/30` | Subtle divider (inside cards, between rows) |
| `border-zinc-800` | Input borders, stronger separators |
| `border-zinc-700/50` | Panel component border (slightly lighter) |

### Teal Accent

Teal is the single accent color used consistently across the site. Do not introduce secondary accent colors.

- **Sidebar active state** — `--sidebar-accent: oklch(0.3 0.06 192)`
- **Section header icons** — used in newsletter-highlights, drafts-view, and similar admin cards
- **Hover promotions** — `group-hover:text-teal-400` (e.g., StatCard arrow icon)
- **TOC active state** — `text-teal-400 border-l-teal-400` in ResearchToc
- **Focus rings** — `focus-visible:ring-teal-500/60` on interactive elements

### Status Colors

| Status | Text | Background | Border | Dot |
|---|---|---|---|---|
| Urgent / Error | `text-red-400` | `bg-red-400/10` | `border-red-400/20` | `bg-red-400` |
| Active / Warning | `text-amber-400` | `bg-amber-400/10` | `border-amber-400/20` | `bg-amber-400` |
| Blocked | `text-orange-400` | `bg-orange-400/10` | `border-orange-400/20` | `bg-orange-400` |
| Scheduled | `text-blue-400` | `bg-blue-400/10` | `border-blue-400/20` | `bg-blue-400` |
| Complete | `text-emerald-400` | `bg-emerald-400/10` | `border-emerald-400/20` | `bg-emerald-400` |
| Neutral | `text-zinc-400` | `bg-zinc-400/10` | `border-zinc-400/20` | `bg-zinc-400` |

**References:** `src/app/globals.css` (`.dark` block), `src/components/admin/status-dot.tsx`. Project statuses (idea/researching/building/launched/archived) use their own color scheme via `STATUS_META` in `src/lib/projects.ts`.

### Do / Don't

- **Don't** use `text-white` — use `text-zinc-100` (less harsh against dark backgrounds)
- **Don't** hardcode hex or rgb values — use OKLCH tokens or the Tailwind zinc scale
- **Do** always apply status colors as a triad: text + background + border together

---

## 2. Typography

### Font Setup

```tsx
// src/app/layout.tsx
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

// Applied at <body>
// font-family: var(--font-geist-sans), system-ui, sans-serif
```

### Fluid Type Scale

All sizes are defined as `clamp()` values in `globals.css` and map to Tailwind's `text-*` utilities via `@theme`.

| Step | CSS Variable | Clamp Value | Approx Size |
|---|---|---|---|
| `text-3xs` | `--text-3xs` | `clamp(0.625rem, 0.6rem + 0.1vw, 0.6875rem)` | ~10–11px |
| `text-2xs` | `--text-2xs` | `clamp(0.6875rem, 0.66rem + 0.12vw, 0.75rem)` | ~11–12px |
| `text-xs` | `--text-xs` | `clamp(0.75rem, 0.72rem + 0.14vw, 0.8125rem)` | ~12–13px |
| `text-sm` | `--text-sm` | `clamp(0.875rem, 0.84rem + 0.16vw, 0.9375rem)` | ~14–15px |
| `text-base` | `--text-base` | `clamp(1rem, 0.96rem + 0.2vw, 1.0625rem)` | ~16–17px |
| `text-lg` | `--text-lg` | `clamp(1.125rem, 1.05rem + 0.32vw, 1.25rem)` | ~18–20px |
| `text-xl` | `--text-xl` | `clamp(1.25rem, 1.13rem + 0.5vw, 1.5rem)` | ~20–24px |
| `text-2xl` | `--text-2xl` | `clamp(1.5rem, 1.3rem + 0.85vw, 1.875rem)` | ~24–30px |
| `text-3xl` | `--text-3xl` | `clamp(1.875rem, 1.55rem + 1.35vw, 2.5rem)` | ~30–40px |
| `text-4xl` | `--text-4xl` | `clamp(2.25rem, 1.8rem + 1.9vw, 3.25rem)` | ~36–52px |

### `.type-*` Component Classes

Defined in `globals.css` under `@layer components`. Used 126+ times across 25 files. **Always prefer these over assembling raw Tailwind utilities.**

| Class | Applies | When to Use |
|---|---|---|
| `.type-display` | `text-4xl font-semibold tracking-tight` | Homepage hero headline |
| `.type-h1` | `text-3xl font-medium tracking-tight` | Primary page headings |
| `.type-h2` | `text-2xl font-medium tracking-tight` | Section headings, stat values |
| `.type-h3` | `text-xl font-medium tracking-tight` | Sub-section headings |
| `.type-lead` | `text-lg leading-relaxed` | Intro paragraphs, subtitles |
| `.type-body` | `text-sm leading-relaxed` | Standard body text |
| `.type-body-sm` | `text-sm leading-relaxed` | Descriptions, secondary text (currently identical to `.type-body`) |
| `.type-label` | `text-xs uppercase tracking-[0.08em] font-medium` | Section labels, category headers |
| `.type-badge` | `text-3xs leading-none uppercase tracking-[0.08em] font-medium font-mono` | Tag badges, tiny labels |
| `.type-code` | `text-sm font-mono` | Inline code, technical values |

### `.doc-markdown` and Modifiers

Prose-styled markdown rendering classes defined in `globals.css`:

- **`.doc-markdown`** — Full prose treatment with `prose-invert prose-zinc`, sized for long-form reading. Includes styled headings, links, code blocks, tables, and `max-width: 65ch` on text blocks.
- **`.doc-markdown-compact`** — Tighter spacing and smaller headings for card contexts or sidebars.
- **`.doc-markdown-subtle`** — Mutes body text to `text-zinc-400` for secondary or supporting content.

### Do / Don't

- **Do** prefer `.type-*` classes over assembling raw Tailwind type utilities
- **Don't** use `font-bold` — use `font-semibold` or `font-medium`
- **Do** use `tracking-tight` on headings at 20px or larger
- **Do** use `tracking-wider` on uppercase labels, or just use `.type-label` which includes it
- **Don't** mix more than 3 type sizes within a single visual section
- **Do** use `font-mono` for counts, stats, and technical data (or reach for `.type-code` / `.type-badge`)

---

## 3. Spacing & Layout

### Spacing Scale

| Utility | Value | Common Use |
|---|---|---|
| `gap-1` / `space-y-1` | 4px | Tight inline spacing |
| `gap-1.5` / `space-y-1.5` | 6px | Tight list items |
| `gap-2` / `space-y-2` | 8px | Icon + text pairs, standard list items |
| `gap-2.5` | 10px | Input internal spacing |
| `gap-3` / `space-y-3` | 12px | Card stacks, button groups |
| `gap-4` / `space-y-4` | 16px | Section group spacing |
| `gap-6` / `space-y-6` | 24px | Major section spacing |

### Semantic Spacing Aliases

| Intent | Value |
|---|---|
| Inline gap (icon + text) | `gap-2` |
| List items | `space-y-1.5` to `space-y-2` |
| Card stacks | `space-y-3` |
| Section spacing | `space-y-6` / `gap-6` |
| Card padding | `px-4 py-3` |
| Input padding | `px-4 py-2.5` |

### Layout Dimensions

| Context | Max Width | Usage |
|---|---|---|
| Public pages | `max-w-xl` (576px) | Homepage, centered content |
| Admin pages | `max-w-4xl` (896px) | All admin views |
| Page padding (public) | `p-6 md:p-8` | Responsive padding |
| Page padding (admin) | `p-6` | Consistent admin padding |

### Admin Page Structure Pattern

```tsx
<div className="max-w-4xl">
  <PageHeader title="Page Title" subtitle="Optional subtitle" />

  <div className="space-y-6 mt-6">
    <div>
      <h2 className="type-label text-zinc-500 mb-3">Section Label</h2>
      {/* Section content */}
    </div>
  </div>
</div>
```

---

## 4. Border Radius

Base variable: `--radius: 0.625rem` (10px)

### Computed Variants

| Token | Computation | Value | Tailwind |
|---|---|---|---|
| `--radius-sm` | `var(--radius) - 4px` | 6px | `rounded-sm` |
| `--radius-md` | `var(--radius) - 2px` | 8px | `rounded-md` |
| `--radius-lg` | `var(--radius)` | 10px | `rounded-lg` |
| `--radius-xl` | `var(--radius) + 4px` | 14px | `rounded-xl` |
| `--radius-2xl` | `var(--radius) + 8px` | 18px | `rounded-2xl` |
| `--radius-3xl` | `var(--radius) + 12px` | 22px | `rounded-3xl` |
| `--radius-4xl` | `var(--radius) + 16px` | 26px | `rounded-4xl` |

### Usage Guidelines

| Element | Radius | Notes |
|---|---|---|
| Cards, panels, inputs | `rounded-lg` | Default for all containers |
| Buttons | `rounded-md` | shadcn default |
| Status dots, avatars | `rounded-full` | Circular elements |
| Tag badges | `rounded` (4px) | Compact pill shape |

---

## 5. Borders & Shadows

### Border System

| Pattern | Tailwind | Usage |
|---|---|---|
| Standard card border | `border border-zinc-800/50` | Cards, panels, containers |
| Panel component border | `border border-zinc-700/50` | Elevated Panel component |
| Subtle divider | `border-zinc-800/30` | Row separators inside cards |
| Input border | `border border-zinc-800` | Form inputs |
| Strong separator | `border-b border-zinc-800` | Section dividers, breadcrumb separator |

### Shadow Tokens

Defined in `globals.css` `.dark` block and registered in `@theme inline`:

| Token | Value | Usage |
|---|---|---|
| `--shadow-card` | `0 1px 2px -1px oklch(1 0 0 / 4%), 0 2px 4px oklch(1 0 0 / 3%)` | Elevated panels, popovers |
| `--shadow-overlay` | `0 4px 12px -2px oklch(0 0 0 / 40%), 0 0 0 1px oklch(1 0 0 / 6%)` | Modals, sheets, dropdown menus |

Usage in Tailwind: `shadow-card`, `shadow-overlay`

### Rules

- Borders are the default — use them on all cards and containers
- Shadows are for overlays only (popovers, sheets, modals)
- Never combine heavy shadow + thick border — pick one for depth
- Don't use `--shadow-overlay` on static cards (use `--shadow-card` or just borders)

---

## 6. Animation & Motion

### Duration Scale

| Token | CSS Variable | Tailwind | Usage |
|---|---|---|---|
| Fast | `--duration-fast` / `100ms` | `duration-100` | Dropdowns, micro-interactions |
| Normal | `--duration-normal` / `200ms` | `duration-200` | Background color changes, most transitions |
| Slow | `--duration-slow` / `300ms` | `duration-300` | MAXIMUM for any UI animation |

**Rule**: Never use `duration-500` or higher.

### Easing

| Token | CSS Variable | Tailwind | When |
|---|---|---|---|
| Ease out | `--ease-out` / `cubic-bezier(0.16, 1, 0.3, 1)` | `ease-out` | Entering elements (appearing, decelerate into place) |
| Ease in | `--ease-in` / `cubic-bezier(0.7, 0, 0.84, 0)` | `ease-in` | Exiting elements (disappearing, accelerate away) |

**Note:** The CSS custom properties define custom curves that differ from Tailwind's built-in `ease-out`/`ease-in` defaults. For most transitions, `transition-colors` with default easing is sufficient. Use the custom properties when precise control is needed (e.g., framer-motion or inline styles).
| Default | — | `transition-colors` | Color transitions (most common on this site) |

### Current Animation Patterns

```tsx
// Color transition (most common)
hover:bg-zinc-800/40 transition-colors

// Multi-property
transition-all duration-150

// Specific property
transition-opacity duration-200

// Loading spinner
animate-spin  // Only on loading states (RefreshCw icon)
```

### Button Interactions

```tsx
// Add to all interactive buttons for tactile feedback
active:scale-[0.98] transition-transform

// Full example
<button className="
  py-2.5 px-4
  bg-zinc-800 hover:bg-zinc-700
  active:scale-[0.98]
  transition-all duration-150
">
  Click me
</button>
```

### Motion (framer-motion) Presets

`motion` v12 is installed. Use these presets for page/list animations:

```tsx
// Fade in
const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.2 }
}

// Slide up (cards, list items)
const slideUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] }
}

// Stagger children (lists)
const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } }
}

// Spring config for interactive elements
const spring = { type: "spring", stiffness: 400, damping: 30 }

// Exit pattern
<AnimatePresence mode="wait">
  {show && <motion.div {...fadeIn} exit={{ opacity: 0 }} key="item" />}
</AnimatePresence>
```

**Rule**: Don't add Motion to shadcn overlays — they have built-in transitions via `tw-animate-css`.

### GPU Acceleration

Prefer animating:
- `transform` (scale, translate, rotate)
- `opacity`

Avoid animating:
- `width`, `height`, `top`, `left`, `right`, `bottom`, `margin`, `padding`

Add `will-change-transform` only if profiling shows jank.

### Do / Don't

- Keep all animations at or under 300ms
- Use `transition-colors` for hover states
- Add `active:scale-[0.98]` to buttons for tactile feedback
- Use `ease-out` for appearing elements, `ease-in` for disappearing
- Don't animate from `scale(0)` — start from `0.95` or higher
- Don't add animation to every element — reserve for intentional interactions

---

## 7. Icon System

Uses Lucide React icons throughout.

### Size Guidelines

| Size | Usage |
|---|---|
| `size={12}` | Small inline icons (chevrons, meta indicators) |
| `size={14}` | Status icons, inline secondary icons |
| `size={16}` | Default section icons, list item icons |
| `size={18}` | Larger icons (auth page Lock, emphasis) |
| `size={32}` | EmptyState illustration icon |

### Color & States

```tsx
// Default
className="text-zinc-500"

// Hover (via group)
className="text-zinc-500 group-hover:text-zinc-400"

// Teal accent (section headers, active states)
className="text-teal-400"

// Hover to teal (StatCard pattern)
className="text-zinc-700 group-hover:text-teal-400 transition-colors"

// Status colors
className="text-red-400"       // Urgent
className="text-amber-400"     // Active/Warning
className="text-emerald-400"   // Complete
className="text-blue-400"      // Scheduled
```

### Common Patterns

```tsx
// Icon + text (most common pattern)
<div className="flex items-center gap-2">
  <Icon size={16} className="text-zinc-500 shrink-0" />
  <span className="text-sm text-zinc-200">{text}</span>
</div>

// Directional icon that changes on hover
<ArrowRight size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />

// Teal accent icon for section headers
<FileText size={16} className="text-teal-400 shrink-0" />
```

### Rules

- Always add `shrink-0` to icons in flex containers
- Icons are decorative — don't rely on them as sole communication
- Use consistent sizes per context (don't mix 14 and 16 in the same row)

---

## 8. Component Catalog

All reusable components with their file path, props, and usage.

### Admin Components

#### Panel
**File**: `src/components/admin/panel.tsx`

Base elevated container for admin content sections.

```tsx
// Renders: rounded-lg border border-zinc-700/50 bg-zinc-800/60
import { Panel } from "@/components/admin/panel"

<Panel className="p-4">
  {/* Content */}
</Panel>
```

**Props**: Extends `React.ComponentProps<"div">` — accepts all div props including `className` for composition.

---

#### PageHeader
**File**: `src/components/admin/page-header.tsx`

Page title with optional subtitle, breadcrumbs, and action slot.

```tsx
import { PageHeader } from "@/components/admin/page-header"

<PageHeader
  title="Research"
  subtitle="12 artifacts"
  breadcrumbs={[
    { label: "Admin", href: "/admin" },
    { label: "Research" }
  ]}
>
  <Button>Action</Button>
</PageHeader>
```

**Props**:
| Prop | Type | Description |
|---|---|---|
| `title` | `string` | Page heading (rendered as `text-lg font-semibold`) |
| `subtitle` | `string?` | Secondary text below title (`text-sm text-zinc-500`) |
| `breadcrumbs` | `Array<{ label: string; href?: string }>?` | Breadcrumb trail above title |
| `children` | `ReactNode?` | Action buttons, right-aligned |

---

#### EmptyState
**File**: `src/components/admin/empty-state.tsx`

Centered message for zero-data views.

```tsx
import { EmptyState } from "@/components/admin/empty-state"
import { FileText } from "lucide-react"

<EmptyState
  icon={FileText}
  message="No research articles yet."
  action={<Button>Add Article</Button>}
/>
```

**Props**:
| Prop | Type | Description |
|---|---|---|
| `icon` | `LucideIcon` | Large centered icon (`size={32}`, 50% opacity) |
| `message` | `string` | Description text (`.type-body-sm`) |
| `action` | `ReactNode?` | Optional CTA button below message |

---

#### StatusDot
**File**: `src/components/admin/status-dot.tsx`

8px colored dot indicator with optional ping animation.

```tsx
import { StatusDot } from "@/components/admin/status-dot"

<StatusDot variant="active" />
<StatusDot variant="urgent" pulse />
```

**Props**:
| Prop | Type | Description |
|---|---|---|
| `variant` | `"urgent" \| "active" \| "blocked" \| "scheduled" \| "complete" \| "neutral"` | Color variant |
| `pulse` | `boolean?` | Adds `animate-ping` ring animation |
| `className` | `string?` | Additional classes |

**Variant colors**: urgent=red, active=amber, blocked=orange, scheduled=blue, complete=emerald, neutral=zinc

---

#### TagBadge
**File**: `src/components/admin/tag-badge.tsx`

Six tag exports for categorical labels, plus four color map exports.

**Tag components**:
| Export | Prop | Usage |
|---|---|---|
| `LaneTag` | `lane: string` | Radar lane category |
| `SourceTag` | `source: string` | Newsletter source attribution |
| `PillarTag` | `pillar: string` | Content pillar label |
| `StatusTag` | `status: ProjectStatus` | Project status with icon |
| `KindTag` | `kind: ProjectKind` | Project kind (product/general) |
| `DomainTag` | `domain: string` | Task domain category |

All share base style: `inline-flex items-center px-2 py-1 rounded type-badge shrink-0`

**Color map exports** (for custom rendering, filter button active states):
- `laneColors` — `Record<string, { tag: string; bg: string }>`
- `sourceColors` — `Record<string, string>`
- `pillarColors` — `Record<string, string>`
- `domainColors` — `Record<string, string>`

Fallback: `bg-zinc-700/40 text-zinc-400` for unknown values.

**Rule**: Never create inline `<span>` badge components. Always use the TagBadge exports.

---

#### MarkdownRenderer
**File**: `src/components/admin/markdown-renderer.tsx`

Prose-styled markdown with GFM table support and optional heading IDs.

```tsx
import { MarkdownRenderer } from "@/components/admin/markdown-renderer"

<MarkdownRenderer
  content={markdownString}
  generateIds
  skipFirstH1
/>
```

**Props**:
| Prop | Type | Description |
|---|---|---|
| `content` | `string` | Raw markdown string |
| `className` | `string?` | Additional wrapper classes |
| `generateIds` | `boolean?` | Adds slugified `id` to `<h2>` elements (for TOC linking) |
| `skipFirstH1` | `boolean?` | Hides the first `<h1>` (when page has its own title) |

Includes custom table rendering with the standard admin table style (`rounded-lg border border-zinc-800/50 bg-zinc-900/30`).

---

#### ResearchGroup
**File**: `src/components/admin/research-group.tsx`

Collapsible section with icon, title, and artifact count.

```tsx
import { ResearchGroup } from "@/components/admin/research-group"

<ResearchGroup title="AI & Machine Learning" count={5}>
  {/* List of items */}
</ResearchGroup>

<ResearchGroup title="Unassigned" count={3} isUnassigned>
  {/* Items */}
</ResearchGroup>
```

**Props**:
| Prop | Type | Description |
|---|---|---|
| `title` | `string` | Group heading |
| `count` | `number` | Displayed as "{n} artifact(s)" |
| `isUnassigned` | `boolean?` | Uses Inbox icon instead of FolderOpen |
| `children` | `ReactNode` | Content revealed when expanded |

Client component (`"use client"`). Starts expanded by default.

---

#### ResearchToc
**File**: `src/components/admin/research-toc.tsx`

Sticky table of contents with IntersectionObserver-driven active state.

```tsx
import { ResearchToc } from "@/components/admin/research-toc"

<ResearchToc headings={[
  { id: "section-1", text: "Section One" },
  { id: "section-2", text: "Section Two" },
]} />
```

**Props**:
| Prop | Type | Description |
|---|---|---|
| `headings` | `Array<{ id: string; text: string }>` | Heading anchors to track |

Active state: `text-teal-400 border-l-teal-400`. Inactive: `text-zinc-500 border-l-transparent hover:text-zinc-300`.

Client component. Returns `null` when headings array is empty.

---

### Dashboard Components

#### StatCard
**File**: `src/components/dashboard/stat-card.tsx`

Linked metric card for dashboard overview.

```tsx
import { StatCard } from "@/components/dashboard/stat-card"

<StatCard
  title="Research"
  value={42}
  subtitle="Last 7 days"
  href="/admin/research"
/>
```

**Props**:
| Prop | Type | Description |
|---|---|---|
| `title` | `string` | Label above value (`.type-label text-zinc-500`) |
| `value` | `string \| number` | Primary metric (`.type-h2 text-zinc-100`) |
| `subtitle` | `string?` | Context below value (`.type-body-sm text-zinc-600`) |
| `href` | `string` | Link destination |
| `children` | `ReactNode?` | Extra content below subtitle |

Uses Panel styling (`border-zinc-700/50 bg-zinc-800/60`). Arrow icon promotes to teal on hover (`group-hover:text-teal-400`).

---

### Pattern Components

These are not standalone components but documented patterns for consistency.

#### Card (Interactive)

```tsx
<div className="
  border border-zinc-800/50
  rounded-lg
  bg-zinc-900/30
  hover:bg-zinc-800/40
  transition-colors
  px-4 py-3
">
  {/* Content */}
</div>
```

#### Card (Static)

```tsx
<div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-4">
  {/* Content */}
</div>
```

#### List Item Link

```tsx
<Link
  href="/path"
  className="
    flex items-center gap-3
    px-4 py-3
    border border-zinc-800/50
    rounded-lg
    bg-zinc-900/30
    hover:bg-zinc-800/40
    transition-colors
    group
  "
>
  <Icon size={16} className="text-zinc-500 shrink-0" />
  <span className="text-sm text-zinc-200 flex-1">{title}</span>
  <ArrowRight size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
</Link>
```

#### Table (Admin)

```tsx
<div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 overflow-hidden">
  <table className="w-full">
    <thead>
      <tr className="text-xs text-zinc-500 border-b border-zinc-800/50">
        <th className="text-left font-medium px-4 py-2.5">Column</th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-zinc-800/30 last:border-0">
        <td className="text-left text-sm text-zinc-300 px-4 py-2.5">Value</td>
      </tr>
    </tbody>
  </table>
</div>
```

#### Input

```tsx
<input
  type="text"
  className="
    w-full px-4 py-2.5
    bg-zinc-900 border border-zinc-800 rounded-lg
    text-zinc-100 placeholder-zinc-600
    focus:outline-none focus:border-zinc-600
    text-sm
  "
  placeholder="Placeholder"
/>
```

#### Button (Primary)

```tsx
<button className="
  w-full py-2.5
  bg-zinc-800 hover:bg-zinc-700
  rounded-lg text-sm font-medium
  transition-colors
  active:scale-[0.98]
  disabled:opacity-50 disabled:pointer-events-none
">
  Button Text
</button>
```

---

## 9. State Patterns

### Loading
- Use `<Skeleton />` (shadcn) for async content placeholders
- Use `animate-spin` on RefreshCw icon for refresh actions
- Apply `opacity-50 pointer-events-none` on containers while loading

```tsx
// Refresh button loading state
<RefreshCw size={14} className={cn("text-zinc-500", loading && "animate-spin")} />

// Container loading overlay
<div className={cn("space-y-3", loading && "opacity-50 pointer-events-none")}>
  {/* Content */}
</div>
```

### Empty
Use the `EmptyState` component for zero-data views:
```tsx
import { EmptyState } from "@/components/admin/empty-state"
import { FileText } from "lucide-react"

<EmptyState icon={FileText} message="No articles found." />
```

### Error
Inline error text for form validation:
```tsx
// Form field error
<p className="text-sm text-red-400 mt-1">{error}</p>

// Error state on input
<input className="... border-red-400/50 focus:border-red-400" />
```

### Disabled
```tsx
// Button disabled state
disabled:opacity-50 disabled:pointer-events-none

// Suppress press animation when disabled
disabled:active:scale-100

// Full disabled button
<button
  disabled={isSubmitting}
  className="
    py-2.5 bg-zinc-800 hover:bg-zinc-700
    active:scale-[0.98]
    disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100
    transition-all
  "
>
  Submit
</button>
```

---

## 10. Accessibility

### Focus Ring Patterns

**shadcn default** (used on all shadcn components):
```tsx
focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]
```

**Custom interactive focus** (used on custom interactive elements like tasks-view):
```tsx
focus-visible:ring-1 focus-visible:ring-teal-500/60
```

**Rule**: Never remove focus styles. If the default ring does not fit the design, replace it with a visible alternative — never just `outline-none` without a replacement.

### Text Contrast
All current text/background combinations pass WCAG AA:

| Text | Background | Passes |
|---|---|---|
| `text-zinc-100` | `bg-zinc-950` | AA |
| `text-zinc-200` | `bg-zinc-950` | AA |
| `text-zinc-300` | `bg-zinc-900/30` | AA |
| `text-zinc-400` | `bg-zinc-950` | AA |
| `text-zinc-500` | `bg-zinc-950` | AA (large text only) |

### Interactive Element Rules
- All clickable elements must have hover states
- Use `cursor-pointer` on non-button clickable elements (or just use `<button>`)
- Add `disabled:opacity-50 disabled:pointer-events-none` to buttons
- Use semantic HTML (`<button>`, `<a>`, `<input>`) — avoid `div` with `onClick`
- Ensure all interactive elements are keyboard accessible

### Color Independence
- Never use color as the only indicator — pair with icons, text, or position
- Status colors are always accompanied by StatusDot or StatusTag components that include text labels

---

## 11. Pattern Checklist

When building a new page or component, verify:

- [ ] Uses appropriate container max-width (`max-w-xl` public, `max-w-4xl` admin)
- [ ] Page title uses `PageHeader` component or `.type-h1`
- [ ] Section labels use `.type-label text-zinc-500`
- [ ] Cards use `border-zinc-800/50`, `bg-zinc-900/30`, `rounded-lg`
- [ ] Elevated panels use `Panel` component (`border-zinc-700/50 bg-zinc-800/60`)
- [ ] Interactive elements have `hover:bg-zinc-800/40 transition-colors`
- [ ] Buttons have `active:scale-[0.98]` and `disabled:opacity-50`
- [ ] Icons use standard sizes (12/14/16/18) and include `shrink-0` in flex
- [ ] Typography uses `.type-*` classes, not raw Tailwind equivalents
- [ ] All transitions are 300ms or under
- [ ] Focus states are visible (never remove `focus-visible:ring`)
- [ ] Tag badges use `TagBadge` exports, not inline `<span>` elements
- [ ] Status indicators use `StatusDot` or `StatusTag`, not custom dots
- [ ] Empty states use `EmptyState` component
- [ ] Spacing uses the documented scale

---

## 12. Common Mistakes

1. **Using raw Tailwind instead of `.type-*` classes** — If a `.type-*` class exists for what you need, use it. Do not assemble `text-xl font-medium tracking-tight` when `.type-h3` does the same thing.

2. **Creating inline badge components** — Never build inline `<span className="text-xs px-2 ...">` badges. Use the `TagBadge` exports (`LaneTag`, `SourceTag`, `StatusTag`, etc.).

3. **Adding Motion to shadcn overlays** — shadcn components (Dialog, Popover, Sheet, DropdownMenu) already have transitions via `tw-animate-css`. Adding framer-motion will conflict.

4. **Using `--shadow-overlay` on cards** — Overlay shadows are for floating elements (modals, popovers). Use `--shadow-card` or just borders for static cards.

5. **Using `text-white`** — Too harsh. Use `text-zinc-100` for primary text.

6. **Inconsistent spacing** — Use the documented scale (`gap-2`, `gap-3`, `gap-4`, `gap-6`). Do not invent `gap-5` or `gap-7`.

7. **Missing hover states** — All interactive elements need hover feedback.

8. **Slow animations** — Nothing over 300ms. Never use `duration-500`.

9. **Forgotten `shrink-0` on icons** — Icons in flex containers will collapse without `shrink-0`.

10. **Missing transitions** — Add `transition-colors` to elements with hover states.

11. **Wrong container width** — Admin = `max-w-4xl`, public = `max-w-xl`.

12. **Uppercase without tracking** — Small uppercase text needs `tracking-wider` (or use `.type-label` / `.type-badge`).

13. **Badges next to page titles** — Admin page titles are clean `<h1>` only. Status belongs per-row in content.

14. **Using `font-bold`** — Never. Use `font-semibold` or `font-medium`.

---

## Reference

- **Component library**: [shadcn/ui](https://ui.shadcn.com)
- **Icons**: [Lucide React](https://lucide.dev)
- **Animation**: [Emil Kowalski — 7 Practical Tips](https://emilkowal.ski/ui/7-practical-design-tips)
- **Typography**: [Geist Font](https://vercel.com/font)
