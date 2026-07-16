# Progress Tracker

Update this file after every meaningful implementation change. This file, not
memory or assumption, is the source of truth for what's actually built.

## Current Phase

- `01-database-schema.md` in progress: schema and Prisma config are written and
  validated locally; the actual migration is blocked on real Supabase
  credentials (see Open Questions).

## Current Goal

- Implement `01-database-schema.md` through `19-demo-and-submission.md`, in
  order, per `ai-workflow-rules.md`.

## Completed

- Removed create-next-app boilerplate: unused `public/*.svg` files, the
  default marketing `app/page.tsx`, `next/font/google` usage in
  `app/layout.tsx` (ui-context.md requires system fonts only), the
  light/dark CSS-variable theme in `globals.css` (dark-only per
  ui-context.md), and the default README

## In Progress

- `01-database-schema.md` — `prisma/schema.prisma` (Session, InterviewPrep,
  InterviewTurn, exactly per spec) and `prisma.config.ts` are written,
  `npx prisma validate` / `npx prisma generate` pass. Actual
  `prisma migrate dev --name init` has not been run against a real database —
  no Supabase project is configured in this environment. `.env` has local
  placeholder values only.

## Next Up

- Get a real Supabase `DATABASE_URL` (pooled) / `DIRECT_URL` (direct) into
  `.env`, then run `npx prisma migrate dev --name init` and commit the
  generated `prisma/migrations/` folder — this unblocks and completes
  `01-database-schema.md`
- Then `02-database-client-and-migrations.md`

## Open Questions

- Need real Supabase `DATABASE_URL` / `DIRECT_URL` to finish verifying
  `01-database-schema.md` (run the migration, confirm tables in Prisma
  Studio). Proposed default: user supplies these in `.env` (already
  gitignored) when ready; no code changes needed once they're set.

## Architecture Decisions

- (Pre-decided, see architecture.md for full detail — logged here so this file
  has a running history as more decisions get made during implementation)
  - No real auth — anonymous session cookie only
  - Postgres via Supabase + Prisma for persistence
  - Server Actions only, no separate `/api/*` route handlers, for all
    AI-calling and data-mutating operations
  - Single-page-per-prep model (`/prep/[id]`), no tabs, no multi-step wizard UI
  - Installed Prisma is v7, which removed `url`/`directUrl` from
    `schema.prisma`'s `datasource` block. Connection config now lives in
    `prisma.config.ts` (CLI/migrations, using `DIRECT_URL`); the runtime
    `PrismaClient` will use a driver adapter (`@prisma/adapter-pg`) with the
    pooled `DATABASE_URL` instead. See `architecture.md` and
    `feature-specs/01-database-schema.md` for detail.

## Session Notes

- To resume work: read this file first, then the next unimplemented
  feature-spec in numeric order under `feature-specs/`.
- Do not begin any frontend feature-spec before the database and AI-layer
  feature-specs it depends on are marked done here.
