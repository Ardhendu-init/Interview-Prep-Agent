# Progress Tracker

Update this file after every meaningful implementation change. This file, not
memory or assumption, is the source of truth for what's actually built.

## Current Phase

- `06-research-agent.md` done. Next: `07-guide-generator.md`.

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
- `03-session-identity.md` — `lib/session.ts` (cookie name
  `interview_prep_session`, `getSessionIdFromCookie`, `setSessionCookie`:
  httpOnly, `sameSite: "lax"`, 1-year `maxAge`, no `Secure` override) and
  `lib/db/session.ts` (`getOrCreateSession`) written exactly per spec. Verified
  end to end via a temporary Route Handler (removed after testing, DB rows
  cleaned up): first-ever visit (no cookie) creates a `Session` row and sets
  the cookie; a repeat request with a valid cookie reuses the same session id
  with no new row/cookie; a request with a cookie whose row had been deleted
  correctly mints a fresh session + cookie. `npx tsc --noEmit` and `npm run
  build` both pass.
  - **Deviation discovered while verifying:** confirmed by direct testing that
    Next.js 16 throws if `cookies().set()` is called during a Server Component
    render (`Cookies can only be modified in a Server Action or Route
    Handler`). `architecture.md`'s Auth and Access Model previously said
    "middleware or the home page Server Component creates a Session row and
    sets a cookie" — the Server Component half of that is not actually
    possible for the *write* path. Updated `architecture.md` to record this.
    Did not wire `getOrCreateSession()` into `app/page.tsx` in this step since
    that's `12-home-page-prep-list.md`'s scope, not `03`'s — see open question
    below for how that step should handle it.
- `04-shared-types-and-validation.md` — `lib/types.ts` and `lib/validation.ts`
  written exactly per spec (`zod` `^4.4.3` was already a dependency, no install
  needed). Verified: `npx tsc --noEmit` passes; manual side-by-side check
  confirms every interface in `types.ts` (`ResearchInput`, `ResearchFindings`,
  `PrepConcept`, `PrepQuestion`, `PrepGuide`, `PrepStatus`, `InterviewTurn`)
  has a corresponding Zod schema in `validation.ts`.
- `05-ai-client-setup.md` — `lib/ai/client.ts` written exactly per spec:
  exports `genAI` (a `GoogleGenAI` instance) and the named `MODEL` constant
  (`"gemini-2.5-flash"`). Installed `@google/genai` as a dependency (not
  previously present). Verified: `grep -rn "process.env.GEMINI_API_KEY"`
  across the repo returns exactly one hit, in this file; `npx tsc --noEmit`
  passes.
- `06-research-agent.md` — `lib/ai/research-agent.ts` written per spec:
  `runResearch(input)` makes a single `genAI.models.generateContent` call with
  `tools: [{ googleSearch: {} }]`, a labeled-format system prompt, treats
  empty text or a non-`"STOP"` `finishReason` as failure, parses the four
  labeled fields with a regex per label, and validates against
  `researchFindingsSchema` before returning — falling back to the spec's
  fixed "Research could not be completed..." object on any failure. Never
  throws (top-level `try/catch` around the API call).
  - **Prompt tuning found via live testing against the real Gemini API** (not
    just type-checking — see `ai-workflow-rules.md`'s "verify end to end"
    rule): an early version of the prompt, tested against a deliberately
    fictional company name ("Qzyxlon Dynamics Pvt Ltd"), caused the model to
    silently substitute a different, real, similarly-initialed company ("XL
    Dynamics") and report on it as if it were the company asked about — a
    worse failure mode than plain fabrication, since it's confidently wrong
    about identity, not just thin on facts. Fixed by adding an explicit
    identity-verification rule to the system prompt (verify search results
    are about a company with the exact name given, not a similar-sounding
    one) plus an explicit instruction that the honest "not found" case must
    still use the four-label format (an early honest-degradation response
    came back as free text with no labels at all, which would have parsed to
    an all-empty-but-schema-valid object — a blank-looking guide — instead of
    the intended fallback message). Re-tested after the fix: the fictional
    company now correctly returns `"No company matching the exact name ...
    could be found..."` in the `COMPANY_OVERVIEW` label with `"N/A"` in the
    rest, which passes validation and reads correctly.
  - Also found via live testing: the originally-planned `maxOutputTokens:
    2048` caused legitimate, real companies (e.g. Zerodha) to occasionally
    hit `finishReason: "MAX_TOKENS"` before finishing the labeled response,
    because Gemini 2.5 Flash's internal "thinking" tokens count against the
    same budget — this would have incorrectly triggered the fallback for a
    normal company. Raised to `maxOutputTokens: 8192` (a large, high-source
    company like Google used ~3100 tokens combined; 8192 leaves comfortable
    headroom) and re-verified STOP/full output for Zerodha and Google.
  - Verified end to end against the real Gemini API (temporary script, not
    committed): a fictional company degrades honestly instead of fabricating
    or misattributing; a mid-size real company (Zerodha) and a well-known
    company (Google) both return specific, non-generic, schema-valid
    findings; a transient upstream 503 correctly falls through to
    `FALLBACK_FINDINGS` via the `catch` branch, confirming the "never throws"
    contract. `npx tsc --noEmit` and `npm run build` both pass.

## In Progress

- None.

## Next Up

- `07-guide-generator.md`

## Open Questions

- How should a brand-new visitor's session cookie actually get persisted,
  given a Server Component can't write cookies? Two reasonable options once
  `09-server-actions-preps.md` or `12-home-page-prep-list.md` is reached: (a)
  home page renders fine without a cookie yet (empty state, nothing to
  persist), and the cookie gets set for real on the first Server Action call
  (e.g. submitting "New Prep") — zero new files, but a home-page-only visitor
  who never takes an action doesn't get a stable session across reloads; (b)
  add a `proxy.ts` (Next 16's renamed `middleware.ts`, defaults to Node.js
  runtime) that pre-seeds the cookie (and the `Session` row) on any request
  missing one, before the Server Component renders — gives every visitor a
  stable session immediately, at the cost of a new architectural boundary and
  unverified behavior under the Vercel deployment adapter (`18-deployment-and-
  infra.md` territory). Not decided — flagging instead of guessing since it's
  not low-stakes (affects deployment architecture). Default leaning: (a), pick
  it up explicitly when implementing `09` or `12`.

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
