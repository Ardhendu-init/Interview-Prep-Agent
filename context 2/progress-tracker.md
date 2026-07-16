# Progress Tracker

Update this file after every meaningful implementation change. This file, not
memory or assumption, is the source of truth for what's actually built.

## Current Phase

- Not started. This is a specs-only handoff — no code exists yet. Start at
  `feature-specs/01-database-schema.md`.

## Current Goal

- Implement `01-database-schema.md` through `19-demo-and-submission.md`, in
  order, per `ai-workflow-rules.md`.

## Completed

- None yet.

## In Progress

- None yet.

## Next Up

- `01-database-schema.md` — this must come first; every later feature-spec
  depends on the schema being in place and migrated

## Open Questions

- None yet. Add any that come up during implementation here, don't leave them
  unresolved in code comments.

## Architecture Decisions

- (Pre-decided, see architecture.md for full detail — logged here so this file
  has a running history as more decisions get made during implementation)
  - No real auth — anonymous session cookie only
  - Postgres via Supabase + Prisma for persistence
  - Server Actions only, no separate `/api/*` route handlers, for all
    AI-calling and data-mutating operations
  - Single-page-per-prep model (`/prep/[id]`), no tabs, no multi-step wizard UI

## Session Notes

- To resume work: read this file first, then the next unimplemented
  feature-spec in numeric order under `feature-specs/`.
- Do not begin any frontend feature-spec before the database and AI-layer
  feature-specs it depends on are marked done here.
