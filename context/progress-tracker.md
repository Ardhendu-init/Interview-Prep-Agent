# Progress Tracker

Update this file after every meaningful implementation change. This file, not
memory or assumption, is the source of truth for what's actually built.

## Current Phase

- `02-database-client-and-migrations.md` done. Next: `03-session-identity.md`.

## Current Goal

- Implement `01-database-schema.md` through `19-demo-and-submission.md`, in
  order, per `ai-workflow-rules.md`.

## Completed

- Removed create-next-app boilerplate: unused `public/*.svg` files, the
  default marketing `app/page.tsx`, `next/font/google` usage in
  `app/layout.tsx` (ui-context.md requires system fonts only), the
  light/dark CSS-variable theme in `globals.css` (dark-only per
  ui-context.md), and the default README
- `01-database-schema.md` — `prisma/schema.prisma` (Session, InterviewPrep,
  InterviewTurn, exactly per spec) and `prisma.config.ts` written.
  `npx prisma migrate dev --name init` run against the real Supabase project
  (`tjlvomfcrfkjykuxwgjr`); migration generated and committed at
  `prisma/migrations/20260716165320_init/`. `npx tsc --noEmit` and
  `npm run build` both pass.
- `02-database-client-and-migrations.md` — `lib/db/client.ts` written: Prisma
  client singleton stashed on `globalThis` in non-production, constructed with
  a `PrismaPg` driver adapter (`@prisma/adapter-pg`, added as a dependency)
  reading the pooled `DATABASE_URL`, since Prisma 7's generated client no
  longer accepts a bare `new PrismaClient()` — it throws
  `PrismaClientInitializationError` without an explicit `adapter`. Verified by
  importing the module twice with cache-busting query strings (simulating two
  hot reloads): both imports resolved to the same `PrismaClient` instance, and
  a live `session.count()` query against the real Supabase database succeeded.
  `npx tsc --noEmit` passes.

## In Progress

- None.

## Next Up

- `03-session-identity.md`

## Open Questions

- None open right now.

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
