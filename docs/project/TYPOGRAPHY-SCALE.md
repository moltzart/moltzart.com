# Typography Scale

## Purpose

This project uses a fluid typography scale with semantic utility classes. The goal is consistent hierarchy across:

- Public landing page
- Blog pages
- Product research and markdown-heavy admin content

## Fluid tokens

Defined in `src/app/globals.css` under `@theme inline`.

| Token | Value | Intended use |
| --- | --- | --- |
| `--text-3xs` | `clamp(0.625rem, 0.6rem + 0.1vw, 0.6875rem)` | Dense badges/chips |
| `--text-2xs` | `clamp(0.6875rem, 0.66rem + 0.12vw, 0.75rem)` | Dense meta, timestamps |
| `--text-xs` | `clamp(0.75rem, 0.72rem + 0.14vw, 0.8125rem)` | Labels, small UI text |
| `--text-sm` | `clamp(0.875rem, 0.84rem + 0.16vw, 0.9375rem)` | Supporting body text |
| `--text-base` | `clamp(1rem, 0.96rem + 0.2vw, 1.0625rem)` | Default body copy |
| `--text-lg` | `clamp(1.125rem, 1.05rem + 0.32vw, 1.25rem)` | Lead paragraphs |
| `--text-xl` | `clamp(1.25rem, 1.13rem + 0.5vw, 1.5rem)` | Sub-headings |
| `--text-2xl` | `clamp(1.5rem, 1.3rem + 0.85vw, 1.875rem)` | Section headings |
| `--text-3xl` | `clamp(1.875rem, 1.55rem + 1.35vw, 2.5rem)` | Page headings |
| `--text-4xl` | `clamp(2.25rem, 1.8rem + 1.9vw, 3.25rem)` | Display headings |

## Semantic utility classes

Defined in `src/app/globals.css` (`@layer components`).

| Class | Role |
| --- | --- |
| `.type-display` | Hero/display title |
| `.type-h1` | Main page title |
| `.type-h2` | Primary section title |
| `.type-h3` | Secondary section title |
| `.type-lead` | Introductory paragraph |
| `.type-body` | Standard body text |
| `.type-body-sm` | Secondary body text |
| `.type-label` | Uppercase UI labels |
| `.type-badge` | Small badge/chip text |
| `.type-code` | Inline code-like text |

## Markdown rules

- Use `.doc-markdown` for long-form content.
- Keep readable measure: paragraphs/lists/blockquote constrained to `65ch`.
- Use `.doc-markdown-compact` for dense cards and toggles.
- Use `.doc-markdown-subtle` when markdown should visually recede.

## Do / Don't

- Do use `type-*` classes for new app-level UI and content typography.
- Do keep markdown rendered through `MarkdownRenderer` + `doc-markdown` variants.
- Do keep metadata in `.type-body-sm` (not mono) and use `.type-badge` for compact chips/badges.
- Don't add new arbitrary text sizes like `text-[10px]` unless there is a documented exception.
- Don't mix multiple competing heading patterns in the same surface.

## Migration checklist (phase 2)

- Sweep remaining admin pages for `text-[10px]` and convert to semantic classes.
- Normalize dashboard/sidebar counts and labels to `.type-body-sm`, `.type-label`, and `.type-badge`.
- Keep UI primitives (buttons/inputs) unchanged unless there is a clear readability issue.
