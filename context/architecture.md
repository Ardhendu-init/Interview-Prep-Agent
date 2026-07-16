# Architecture Context

## Stack

| Layer       | Technology                                | Role                                                        |
| ----------- | ------------------------------------------ | ------------------------------------------------------------- |
| Framework    | Next.js 15 (App Router) + TypeScript        | Single deployable unit — frontend + backend in one app         |
| UI            | Tailwind CSS, utility classes only            | Styling — no component library, see ui-context.md               |
| ORM             | Prisma 7                                        | Type-safe database access, migrations                           |
| Database          | PostgreSQL via Supabase                           | Persistence — sessions, prep guides, interview turns             |
| AI Provider          | Anthropic API (`@anthropic-ai/sdk`)                 | Research agent, guide generation, mock interviewer                |
| Validation              | Zod                                                   | Runtime validation at every system boundary — see code-standards |
| Deployment                | Vercel                                                  | Hosting; connects to Supabase via `DATABASE_URL`                  |
| Session identity             | Signed httpOnly cookie (no auth library)                  | Anonymous session scoping, not real authentication                 |

## System Boundaries

- `app/` — routes, page composition, Server Actions. No direct Prisma or Anthropic
  calls here — this layer calls into `lib/`.
- `app/actions.ts` — the *only* bridge between client components and business logic
  in `lib/`. Every Server Action: (1) reads/validates session cookie, (2) validates
  input with a Zod schema, (3) delegates to `lib/`, (4) returns a typed result.
- `lib/ai/` — all model-calling logic: `research-agent.ts`, `guide-generator.ts`,
  `mock-interviewer.ts`, plus a shared `client.ts`. Nothing here touches the
  database directly — it receives data in, returns data out, pure functions from
  the database's point of view.
- `lib/db/` — all Prisma access, wrapped in named functions (e.g.
  `createPrep`, `getPrepById`, `appendInterviewTurn`, `listPrepsForSession`). No
  file outside `lib/db/` imports the Prisma client directly — this is the only
  place `PrismaClient` is instantiated or queried.
- `lib/session.ts` — cookie read/write/create logic for anonymous session identity.
- `lib/types.ts` — shared TypeScript interfaces, source of truth, mirrored by Zod
  schemas in `lib/validation.ts`.
- `components/` — presentational + client-interactive UI. No direct calls to
  `lib/ai/` or `lib/db/` — always through a Server Action.
- `prisma/schema.prisma` — the database schema, the single source of truth for
  data shape (see `01-database-schema.md`).
- `prisma.config.ts` — Prisma 7 connection config for the CLI (migrate, studio,
  introspect). Prisma 7 removed `url`/`directUrl` from the `datasource` block in
  `schema.prisma` entirely; the CLI now reads its connection string from this
  file instead. It points at `DIRECT_URL` (migrations need the non-pooled
  connection). The app's runtime `PrismaClient` (in `lib/db/client.ts`, added in
  `02-database-client-and-migrations.md`) connects separately via a driver
  adapter (`@prisma/adapter-pg`) using the pooled `DATABASE_URL` — this replaces
  the old single-file `url`/`directUrl` split with a two-file one, same intent.
- `context/` — this folder. Never imported by app code.

## Storage Model

- **Database (Postgres via Supabase)** holds all durable state:
  - `Session` — anonymous session identity
  - `InterviewPrep` — one row per company/role research session: input, research
    findings, generated guide (stored as `Json`), timestamps
  - `InterviewTurn` — one row per chat turn in a mock interview, foreign-keyed to
    `InterviewPrep`, ordered by `createdAt`
- **No blob/file storage.** The markdown export is generated client-side from
  already-fetched data and never touches the server as a file.
- Full schema defined in `01-database-schema.md` — treat that file, not this one,
  as the authoritative field-level source.

## Auth and Access Model

- No real authentication. On first visit, a `Session` row is created and a
  signed httpOnly cookie containing the session id is set.
- **Verified constraint (Next.js 16, `03-session-identity.md`):** a Server
  Component render cannot call `cookies().set()` — confirmed by direct testing,
  Next.js throws `Cookies can only be modified in a Server Action or Route
  Handler` if it tries. This means `getOrCreateSession()` can only *persist* a
  newly created session (i.e. actually set the cookie) when called from a
  Server Action or Route Handler — never from a plain Server Component render
  (e.g. the home page listing past preps). `getOrCreateSession()` itself is
  implemented exactly per spec and works correctly end to end when called from
  a Server Action/Route Handler (verified: first visit creates a session +
  cookie, a repeat visit with a valid cookie reuses it, a valid cookie whose
  row was deleted gets a fresh session + cookie). How the home page's
  first-ever-visit case is handled (bootstrap via the first Server Action call
  vs. a `proxy.ts` — Next 16's renamed `middleware.ts` — pre-seeding the
  cookie) is an open decision, deferred to whichever of
  `09-server-actions-preps.md` or `12-home-page-prep-list.md` is implemented
  first. See open question in `progress-tracker.md`.
- Every `InterviewPrep` row is scoped to exactly one `Session` via a foreign key.
  A user can only read/mutate `InterviewPrep` rows belonging to their own session
  cookie — enforce this check in every `lib/db/` function that takes a prep id,
  not just at the UI layer.
- This is explicitly *not* secure identity — a cleared cookie loses access to past
  preps permanently, and there is no recovery mechanism. This is acceptable and
  intentional for this project's scope; do not add password-based recovery.

## Invariants

1. The Anthropic API key and the database connection string are read only in
   server-side code (`lib/ai/client.ts`, `lib/db/client.ts`), both executed only
   inside Server Actions or Server Components. Neither is ever sent to or
   readable by the client.
2. Server Actions do not contain prompt text, model-calling logic, or raw Prisma
   queries directly — they validate input, then delegate to `lib/ai/` and/or
   `lib/db/`. Business logic lives in `lib/`, not in `app/actions.ts`.
3. Every function in `lib/ai/` degrades gracefully (returns a usable, typed
   fallback object) rather than throwing, so the UI never shows a raw crash for a
   bad or empty model response. Every function in `lib/db/` is allowed to throw —
   database failures are real failures and Server Actions must catch and surface
   them as a user-facing error state, not swallow them silently.
4. Every `InterviewPrep` and `InterviewTurn` read or write is scoped by session id
   — there is no code path that reads another session's data, including for
   debugging. If a debug/admin view is ever needed, it is a separate explicit
   decision, not a byproduct of loose scoping.
5. `PrismaClient` is instantiated exactly once per process (singleton pattern in
   `lib/db/client.ts`, using the standard Next.js dev-mode global-caching pattern
   to avoid exhausting connections under hot reload).
6. All Server Action inputs are validated with a Zod schema from
   `lib/validation.ts` before any use — no field from client input reaches
   `lib/ai/` or `lib/db/` unvalidated.
