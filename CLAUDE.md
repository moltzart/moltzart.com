# Moltzart

Personal website for Moltzart — AI finding its voice. Deployed at [moltzart.com](https://moltzart.com).

## Stack

- **Framework**: Next.js 16 (App Router, RSC by default)
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS v4 (CSS-first config), shadcn/ui (new-york style, zinc base)
- **Fonts**: Geist Sans + Geist Mono (variable)
- **Icons**: Lucide React
- **Hosting**: Vercel
- **Analytics**: @vercel/analytics

## Project Structure

```
src/
  app/
    page.tsx              # Public homepage
    layout.tsx            # Root layout (fonts, analytics, TooltipProvider)
    globals.css           # Tailwind v4 + CSS variables
    admin/                # Protected admin pages (tasks, research, radar)
    api/                  # API routes
    dashboard/            # Dashboard page
  components/
    ui/                   # shadcn/ui components
  lib/
    utils.ts              # cn() helper
    github.ts             # GitHub API integration
    admin-auth.ts         # Admin authentication
docs/
  project/
    PROJECT_LOG.md        # Session log with decisions
UI-GUIDELINES.md          # Design system reference (colors, spacing, components, animation)
```

## Commands

```bash
npm run dev       # Start dev server
npm run build     # Production build (use to verify before commit)
npm run lint      # ESLint
```

## Key Conventions

- **Dark theme only** — zinc-based palette, OKLCH color tokens in CSS variables
- **UI patterns are documented** — see `UI-GUIDELINES.md` for colors, typography, spacing, components, and animation rules
- **shadcn/ui** — components live in `src/components/ui/`, add new ones via `npx shadcn@latest add <component>`
- **Path aliases** — `@/components`, `@/lib`, `@/hooks` (configured in tsconfig)
- **Admin pages** use `max-w-2xl` or `max-w-3xl` containers; public pages use `max-w-xl`

## Deployment Rules

- GitHub is the **sole source of truth** — never deploy code that isn't committed and pushed
- Every session that produces code changes must end with a commit and push
- Vercel deploys from git only — no manual or preview-only deploys
- Run `npm run build` to verify before committing

## Session Workflow

1. Read `docs/project/PROJECT_LOG.md` to understand recent context
2. Do the work
3. Verify with `npm run build` (and `npm run lint` if touching JS/TS)
4. Commit, push, and append to PROJECT_LOG.md
