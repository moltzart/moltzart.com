# UI Guidelines — moltzart.com

Practical design principles adapted from mattdowney.com for Moltzart's simpler, focused site.

---

## Design System Overview

### Tech Stack
- **Framework**: Next.js 15 + Tailwind CSS v4
- **Components**: shadcn/ui
- **Font**: Geist Sans (variable) + Geist Mono
- **Theme**: Dark (zinc-based palette)
- **Icons**: Lucide React (14-16px typical)

### Philosophy
- **Consistency over novelty** — patterns should be predictable
- **Performance first** — fast animations, GPU-accelerated properties only
- **Accessibility** — hover states, focus rings, semantic HTML
- **Practical not perfect** — ship working UI, iterate later

---

## Color Tokens (Dark Theme)

### Background & Surface
```css
--background: oklch(0.141 0.005 285.823)  /* zinc-950 */
--card: oklch(0.21 0.006 285.885)         /* zinc-900 (elevated surface) */
--muted: oklch(0.274 0.006 286.033)       /* zinc-800 (subtle backgrounds) */
```

### Text
```css
--foreground: oklch(0.985 0 0)            /* zinc-100 (primary text) */
--muted-foreground: oklch(0.705 0.015 286.067)  /* zinc-500 (secondary text) */
```

### Borders & Input
```css
--border: oklch(1 0 0 / 10%)              /* white/10% */
--input: oklch(1 0 0 / 15%)               /* white/15% */
```

### Interactive
```css
--primary: oklch(0.92 0.004 286.32)       /* zinc-300 (interactive elements) */
--ring: oklch(0.552 0.016 285.938)        /* zinc-600 (focus rings) */
```

### Semantic Colors
```css
--destructive: oklch(0.704 0.191 22.216)  /* red */
--chart-1: oklch(0.488 0.243 264.376)     /* purple */
--chart-2: oklch(0.696 0.17 162.48)       /* green */
--chart-3: oklch(0.769 0.188 70.08)       /* yellow */
--chart-4: oklch(0.627 0.265 303.9)       /* pink */
--chart-5: oklch(0.645 0.246 16.439)      /* orange */
```

### Usage in Components
```tsx
// Background
bg-zinc-950          // Page background
bg-zinc-900/30       // Card background
bg-zinc-800/40       // Hover state
bg-zinc-900          // Input background

// Borders
border-zinc-800/50   // Card border
border-zinc-800/30   // Divider
border-zinc-800      // Input border

// Text
text-zinc-100        // Headings, primary text
text-zinc-200        // Body text
text-zinc-300        // De-emphasized body
text-zinc-400        // Muted text
text-zinc-500        // Labels, meta
text-zinc-600        // Very subtle text

// Status colors (from admin dashboard patterns)
text-red-400         // Urgent
text-amber-400       // Active/Warning
text-orange-400      // Blocked
text-blue-400        // Scheduled
text-emerald-400     // Complete/Success
text-zinc-400        // Backlog
```

---

## Typography

### Font Setup
```tsx
// layout.tsx
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

// Applied at root
font-family: var(--font-geist-sans), system-ui, sans-serif
```

### Type Scale
```tsx
text-3xl font-semibold tracking-tight     // Homepage h1 (28px)
text-xl font-semibold tracking-tight      // Admin page h1 (20px)
text-sm font-medium                       // Section headers (14px)
text-sm                                   // Body text (14px)
text-xs                                   // Meta, labels (12px)
text-xs font-mono                         // Code, counts (12px)
```

### Semantic Tags
- **H1**: Homepage hero or admin page title — `text-xl` or `text-3xl`, `font-semibold tracking-tight`
- **H2**: Section labels — `text-xs font-medium text-zinc-500 uppercase tracking-wider`
- **Body**: Most UI text — `text-sm text-zinc-200`
- **Meta**: Timestamps, counts — `text-xs text-zinc-600`
- **Links**: Underline on hover, `hover:text-zinc-100` or `hover:text-white`

### Do / Don't
- ✅ Use `tracking-tight` on large headings (≥20px)
- ✅ Use `tracking-wider` on small uppercase labels
- ✅ Use `font-mono` for counts, stats, technical data
- ❌ Don't mix more than 3 font sizes per page
- ❌ Don't use `font-bold` — use `font-semibold` or `font-medium`

---

## Spacing & Layout

### Container Patterns
```tsx
// Homepage
max-w-xl mx-auto                  // 576px centered

// Admin pages
max-w-4xl                          // 896px (all admin pages)

// Padding
p-6 md:p-8                         // Page padding (public)
p-6                                // Page padding (admin)
px-4 py-3                          // Card padding
px-4 py-2.5                        // Input padding
```

### Spacing Scale
```tsx
gap-1        // 0.25rem / 4px
gap-1.5      // 0.375rem / 6px
gap-2        // 0.5rem / 8px
gap-2.5      // 0.625rem / 10px
gap-3        // 0.75rem / 12px (common)
gap-4        // 1rem / 16px (common)
gap-6        // 1.5rem / 24px (section spacing)

space-y-1.5  // Tight list spacing
space-y-2    // Standard list spacing
space-y-3    // Card list spacing
space-y-4    // Section group spacing
space-y-6    // Major section spacing
```

### Admin Page Structure
```tsx
<div className="max-w-4xl">
  <h1 className="text-xl font-semibold tracking-tight mb-6">
    Page Title
  </h1>
  
  {/* Content sections */}
  <div className="space-y-6">
    <div>
      <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
        Section Label
      </h2>
      {/* Section content */}
    </div>
  </div>
</div>
```

---

## Component Patterns

### Card (Interactive)
```tsx
<div className="
  border border-zinc-800/50 
  rounded-lg 
  bg-zinc-900/30 
  hover:bg-zinc-800/40 
  transition-colors
  px-4 py-3
">
  {/* Card content */}
</div>
```

### Card (Static Display)
```tsx
<div className="
  rounded-lg 
  border border-zinc-800/50 
  bg-zinc-900/30 
  p-4
">
  {/* Card content */}
</div>
```

### List Item Link
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

### Collapsible Section
```tsx
const [collapsed, setCollapsed] = useState(false)
const Chevron = collapsed ? ChevronRight : ChevronDown

<div className="border border-zinc-800/50 rounded-lg bg-zinc-900/30">
  <button
    onClick={() => setCollapsed(!collapsed)}
    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/20 transition-colors rounded-lg"
  >
    <Icon size={16} className="text-zinc-500" />
    <span className="text-sm font-medium text-zinc-200 flex-1 text-left">
      {title}
    </span>
    <Chevron size={14} className="text-zinc-600" />
  </button>
  {!collapsed && (
    <div className="px-4 pb-3 border-t border-zinc-800/30">
      {/* Content */}
    </div>
  )}
</div>
```

### Tag Badges

Categorical tags for radar lanes and newsletter sources. Use the shared component at `src/components/admin/tag-badge.tsx` — do **not** create inline badge components.

```tsx
import { LaneTag, SourceTag } from "@/components/admin/tag-badge";

// Radar lane — colored pill, uppercase
<LaneTag lane={item.lane} />

// Newsletter source — colored pill, proper case
<SourceTag source={article.source} />
```

Both variants share the same base style:
```
inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium shrink-0
```

Color maps (`laneColors`, `sourceColors`) are also exported for cases that need the raw color value (e.g., filter button active states). Fallback is `bg-zinc-700/40 text-zinc-400` for unknown values.

**Placement**: In compact list rows (dashboard and full-page), tags are right-aligned on the same row as the title, with the title taking `flex-1 min-w-0`.

**Do not use**: `<Badge variant="outline">` or inline `<span>` for lane/source tags. Always use `LaneTag` / `SourceTag`.

### Status Badge
```tsx
<span className="
  text-xs font-mono 
  px-2 py-0.5 
  rounded-full 
  border
  bg-red-400/10 text-red-400 border-red-400/20
">
  {count}
</span>

// Status variants:
bg-red-400/10 text-red-400 border-red-400/20        // Urgent
bg-amber-400/10 text-amber-400 border-amber-400/20  // Active
bg-emerald-400/10 text-emerald-400 border-emerald-400/20  // Complete
bg-zinc-400/10 text-zinc-400 border-zinc-400/20    // Neutral
```

### Table (Admin Pattern)
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

### Input
```tsx
<input
  type="text"
  className="
    w-full 
    px-4 py-2.5 
    bg-zinc-900 
    border border-zinc-800 
    rounded-lg 
    text-zinc-100 
    placeholder-zinc-600 
    focus:outline-none 
    focus:border-zinc-600 
    text-sm
  "
  placeholder="Placeholder"
/>
```

### Button (Primary)
```tsx
<button className="
  w-full 
  py-2.5 
  bg-zinc-800 
  hover:bg-zinc-700 
  rounded-lg 
  text-sm font-medium 
  transition-colors 
  disabled:opacity-50
">
  Button Text
</button>
```

---

## Animation Guidelines

### Duration Scale
```tsx
duration-100  // 100ms — Dropdowns, micro-interactions
duration-150  // 150ms — Icon color changes (current standard)
duration-200  // 200ms — Background color changes, most transitions
duration-300  // 300ms — MAXIMUM for any UI animation
// NEVER use duration-500 or higher
```

### Easing
```tsx
// ENTERING elements (appearing) — decelerate into place
ease-out

// EXITING elements (disappearing) — accelerate away
ease-in

// Color transitions (most common on this site)
transition-colors  // Uses default easing (ease)
```

### Current Animation Patterns
```tsx
// Color transition (most common)
hover:bg-zinc-800/40 transition-colors

// Multi-property (when needed)
transition-all

// Specific property
transition-opacity duration-200

// Rotate (refresh icon)
animate-spin  // Only on loading states
```

### Button Interactions
```tsx
// Add to all interactive buttons
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

### Do / Don't
- ✅ Keep all animations ≤300ms
- ✅ Use `transition-colors` for hover states (default easing is fine)
- ✅ Add `active:scale-[0.98]` to buttons for tactile feedback
- ✅ Use `ease-out` for appearing elements
- ✅ Use `ease-in` for disappearing elements
- ❌ Don't animate from `scale(0)` — start from 0.95+
- ❌ Don't use `duration-500` or higher
- ❌ Don't animate `width`, `height`, `top`, `left` — use `transform` and `opacity`
- ❌ Don't add animation to every element — reserve for intentional interactions

---

## Borders vs Shadows

### Current Pattern: Borders
This site uses **borders** for all card and component outlines:

```tsx
border border-zinc-800/50  // Standard card border
border border-zinc-800/30  // Subtle divider
```

### When to Use Shadows (Future Consideration)
Matt's site uses subtle shadows for depth. If we adopt shadows:

```css
/* Multi-layer shadow for subtle depth */
box-shadow:
  0px 0px 0px 1px rgba(255, 255, 255, 0.06),
  0px 1px 2px -1px rgba(255, 255, 255, 0.06),
  0px 2px 4px 0px rgba(255, 255, 255, 0.04);
```

**Current decision**: Stick with borders. They're simpler and consistent with shadcn/ui defaults.

---

## Icon Usage

### Size Guidelines
```tsx
size={16}  // Section icons (default)
size={14}  // Inline icons, status icons
size={12}  // Small icons (chevrons, meta)
size={18}  // Larger icons (Lock on auth pages)
```

### Color & States
```tsx
// Default
className="text-zinc-500"

// Hover state
className="text-zinc-500 group-hover:text-zinc-400"

// Status colors
className="text-red-400"      // Urgent
className="text-amber-400"    // Active
className="text-emerald-400"  // Complete
```

### Common Patterns
```tsx
// Icon + text
<div className="flex items-center gap-2">
  <Icon size={16} className="text-zinc-500" />
  <span className="text-sm text-zinc-200">{text}</span>
</div>

// Icon with shrink protection
<Icon size={16} className="text-zinc-500 shrink-0" />

// Icon that changes on hover
<ArrowRight size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
```

---

## Accessibility

### Focus States
shadcn/ui button component includes comprehensive focus styles:

```tsx
outline-none 
focus-visible:border-ring 
focus-visible:ring-ring/50 
focus-visible:ring-[3px]
```

**Rule**: Never remove focus styles. If default ring doesn't fit your design, replace it with a visible alternative.

### Interactive Elements
- ✅ All clickable elements should have hover states
- ✅ Use `cursor-pointer` for non-button clickable elements (or just use `<button>`)
- ✅ Add `disabled:opacity-50` and `disabled:pointer-events-none` to buttons
- ✅ Use semantic HTML (`<button>`, `<a>`, `<input>`)

### Text Contrast
All current text/background combinations pass WCAG AA:
- `text-zinc-100` on `bg-zinc-950` ✅
- `text-zinc-200` on `bg-zinc-950` ✅
- `text-zinc-300` on `bg-zinc-900/30` ✅
- `text-zinc-500` on `bg-zinc-950` ✅ (for meta text, labels)

---

## Performance

### GPU-Accelerated Properties
Prefer these for animations:
- `transform` (scale, translate, rotate)
- `opacity`

Avoid animating:
- `width`, `height`
- `top`, `left`, `right`, `bottom`
- `margin`, `padding`

### Will-Change
Not currently used. Add only if profiling shows jank:
```tsx
className="will-change-transform"
```

---

## Pattern Checklist

When building a new page or component, verify:

- [ ] Uses appropriate container max-width (`max-w-xl` for public, `max-w-4xl` for admin)
- [ ] H1 uses `text-xl font-semibold tracking-tight`
- [ ] Section labels use `text-xs font-medium text-zinc-500 uppercase tracking-wider`
- [ ] Cards use `border-zinc-800/50`, `bg-zinc-900/30`, `rounded-lg`
- [ ] Interactive elements have `hover:bg-zinc-800/40 transition-colors`
- [ ] Buttons have `active:scale-[0.98]` if appropriate
- [ ] Icons are 14-16px and use `shrink-0` when in flex containers
- [ ] All transitions are ≤300ms
- [ ] Focus states are visible (don't remove `focus-visible:ring`)
- [ ] Spacing uses consistent scale (gap-3, gap-4, space-y-3, etc.)

---

## Common Mistakes to Avoid

1. **Inconsistent spacing** — Use the documented scale (gap-3, gap-4, space-y-3). Don't invent new values.
2. **Missing hover states** — All interactive elements need hover feedback.
3. **Slow animations** — Nothing over 300ms.
4. **Wrong text color** — Don't use `text-white` (too harsh). Use `text-zinc-100` or `text-zinc-200`.
5. **Forgotten `shrink-0` on icons** — Icons in flex containers collapse. Add `shrink-0`.
6. **Missing transitions** — Add `transition-colors` to elements with hover states.
7. **Wrong container width** — Admin pages use `max-w-4xl`, public pages use `max-w-xl`.
8. **Uppercase without tracking** — Small uppercase text needs `tracking-wider`.
9. **Badges/status next to page title** — Admin page titles are `<h1>` only. No badges, counters, or status indicators inline with the title. Status belongs in the page content (per-row badges on list items).

---

## Next Steps / Future Improvements

1. **Add active:scale to all buttons** — Currently missing on most buttons
2. **Consider shadow system** — If borders feel flat, test Matt's shadow pattern
3. **Staggered list animations** — For future paginated content (research, drafts)
4. **Loading states** — Skeleton components for async data
5. **Toast notifications** — For actions like "Copied" or "Saved"
6. **Mobile menu** — If navigation grows beyond current simple links

---

## Reference

- **Inspiration**: [mattdowney.com Design Guidelines](https://mattdowney.com)
- **Component library**: [shadcn/ui](https://ui.shadcn.com)
- **Icons**: [Lucide React](https://lucide.dev)
- **Animation reference**: [Emil Kowalski — 7 Practical Tips](https://emilkowal.ski/ui/7-practical-design-tips)
