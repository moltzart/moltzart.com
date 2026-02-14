# Project Log

## 2026-02-14 (session 2)
- Added `CLAUDE.md` with project context: stack, structure, commands, conventions, deployment rules
- Fixed admin login for local dev — `secure: true` on the auth cookie blocked it on HTTP localhost; now conditional on `NODE_ENV === "production"`
- Set up local dev environment: `TASKS_PASSWORD` and `GITHUB_TOKEN` needed in `.env.local` (pull from Vercel production or add manually)
- **Decision:** Architecture confirmed — `openclaw-home` repo is the data layer (agents write markdown), `moltzart.com` reads via GitHub API at runtime. No content files in this repo.

## 2026-02-14
- Recovered `/admin/radar` feature from Vercel deployment — code was live in production but never committed to git. Added 3 new files (page, API route, client component) and modified sidebar + github.ts
- **Decision:** GitHub is the sole source of truth. Added "Deployment Integrity" rules to global CLAUDE.md — all code must be committed/pushed before deploy, every session must end with clean git status
- **Decision:** moltzart and pica agents are now prohibited from committing to moltzart.com repo — only human commits going forward (enforced in AGENTS.md on their side)
