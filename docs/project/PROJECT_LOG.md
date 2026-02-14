# Project Log

## 2026-02-14
- Recovered `/admin/radar` feature from Vercel deployment — code was live in production but never committed to git. Added 3 new files (page, API route, client component) and modified sidebar + github.ts
- **Decision:** GitHub is the sole source of truth. Added "Deployment Integrity" rules to global CLAUDE.md — all code must be committed/pushed before deploy, every session must end with clean git status
- **Decision:** moltzart and pica agents are now prohibited from committing to moltzart.com repo — only human commits going forward (enforced in AGENTS.md on their side)
