# Progress Tracker

Update this file after every meaningful implementation change. This file, not
memory or assumption, is the source of truth for what's actually built.

## Current Phase

- `13-new-prep-form.md` done. Next: `14-prep-page-and-guide-view.md`.

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
- `07-guide-generator.md` — `lib/ai/guide-generator.ts` written per spec:
  `generateGuide(input, research)` makes a single
  `genAI.models.generateContent` call with `responseMimeType:
  "application/json"` and an explicit `maxOutputTokens: 8192`, strips
  accidental code fences, `JSON.parse`s defensively, and validates against
  `prepGuideSchema` before returning — falling back to the spec's fixed
  `{ summary: "The guide could not be generated. Please try again.", concepts:
  [], questions: [] }` object on any failure (API error, non-STOP finish,
  parse failure, or schema failure). Never throws (top-level `try/catch`
  around the API call, same pattern as `research-agent.ts`).
  - **Deviation found and fixed in the same step:** the spec's fallback object
    has empty `concepts`/`questions` arrays and must satisfy
    `prepGuideSchema`, but the schema as written in
    `04-shared-types-and-validation.md` had `.min(1)` on both arrays — so the
    fallback would have failed its own validation. Fixed by changing both to
    `.max(...)` only (no minimum), in `lib/validation.ts`, in this step. This
    doesn't weaken validation on the success path — the system prompt still
    requires 5-8 concepts / 6-10 questions, and a real successful generation
    will always exceed the old minimums anyway.
  - Verified end to end against the real Gemini API (temporary script, not
    committed): a research-grounded company (Zerodha, Backend Engineer role)
    produced 6 concepts and 8 questions, all `whyItMatters` text specific and
    non-generic — explicitly referencing Zerodha's actual Go/NATS/Kafka stack,
    sub-40ms latency requirements, and DSA-heavy interview rounds pulled from
    the research findings, with real resource URLs (go.dev, Zerodha's own tech
    blog, System Design Primer). This satisfies the spec's core quality bar
    (item 3) and the `19-manual-verification.md` item-4 requirement that
    `whyItMatters` be company-specific rather than templated.
  - **Could not complete the planned two-company comparison** (item 4 also
    asks for `whyItMatters` to differ between two different companies for the
    same role): a second live call against Google hit the Gemini free-tier's
    hard daily cap (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`, limit
    20 requests/day, HTTP 429) — quota exhausted for the day by testing done
    across this step and `06-research-agent.md`, not a code defect. This
    doubled as a valid real-world confirmation of the "never throws" contract:
    the 429 correctly fell through the `catch` branch to `FALLBACK_GUIDE`
    rather than crashing. Re-run the second-company comparison once the daily
    quota resets, before treating `19-manual-verification.md` item 4 as fully
    closed. `npx tsc --noEmit` and `npm run build` both pass.
- `08-mock-interviewer.md` — `lib/ai/mock-interviewer.ts` written per spec:
  `interviewTurn(input, guide, history)` maps the full `InterviewTurn[]`
  history into Gemini's multi-turn `Content[]` format (`"candidate"` →
  `"user"`, `"interviewer"` → `"model"`), sends it with a system prompt built
  from `input` (company/role) plus the guide's full concept list and question
  bank, and returns the plain-text response. Empty history is handled by
  passing a plain string nudge ("Begin the interview with your opening
  question.") instead of an empty `Content[]`, and the system prompt
  separately instructs the model to skip feedback and just ask an opening
  question on the first turn. Stateless — no `lib/db/` import, matching the
  spec's statelessness requirement; the calling Server Action (`10-server-
  actions-interview.md`) owns persistence. Never throws: same top-level
  `try/catch` + non-`"STOP"`-finish-reason pattern as `research-agent.ts` /
  `guide-generator.ts`, falling back to the spec's suggested in-character
  recovery line ("Sorry, let's pick this back up...") on any failure.
  - Verified end to end against the real Gemini API (temporary script, not
    committed), using a Zerodha/Backend-Engineer guide: turn 1 with empty
    history correctly returned only an opening question with no feedback
    text, satisfying requirement 7. A second branch continuing from that same
    opening question with a deliberately strong, detailed answer (sharded
    in-memory order book, lock-free ring buffers, NATS fills, async Kafka
    persistence) correctly returned brief specific praise followed by a
    follow-up question, satisfying the feedback-then-next-question shape in
    requirement 4.
  - **Could not complete the full shallow-vs-strong divergence check** (spec's
    "Verify" section / `19-manual-verification.md` item 5, which wants both a
    shallow and a strong answer in the *same* session compared side by side):
    the shallow-answer call in the same test session hit the same Gemini
    free-tier daily cap (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`,
    20 requests/day, HTTP 429) already flagged as an open item under
    `07-guide-generator.md` above — confirmed via a raw debug call showing the
    429 `RESOURCE_EXHAUSTED` response directly, not a code defect. This is
    itself a valid, useful confirmation of the "never throws" contract: the
    production `interviewTurn()` call in the same failing case correctly
    returned the fallback recovery line instead of crashing, live, under a
    real quota exhaustion rather than a simulated one. Re-run the full
    shallow-vs-strong same-session comparison once the daily quota resets
    (next UTC day), alongside the still-open `07` second-company comparison,
    before treating `19-manual-verification.md` item 5 as fully closed.
    `npx tsc --noEmit` and `npm run build` both pass.
- `09-server-actions-preps.md` — `lib/db/preps.ts` (`createPrep`,
  `getPrepById`, `listPrepsForSession`, `updatePrepResearch`,
  `updatePrepGuide`, `markPrepFailed`) and `app/actions.ts`
  (`createPrepAndRunAgent`, `runResearchAndGuide`) written exactly per spec.
  `getPrepById`/`listPrepsForSession` map each Prisma row to the new
  `InterviewPrepRecord` type (added to `lib/types.ts`) via a `toRecord`
  helper that re-validates the `researchFindings`/`guide` `Json` columns
  through the existing `researchFindingsSchema`/`prepGuideSchema` (not
  trusted as their Prisma `Json` type alone, per code-standards.md) —
  malformed JSON in either column degrades to `null` on read rather than
  throwing. `getPrepById` uses a single `findFirst({ id, sessionId })` query
  so a wrong-session read and a nonexistent-id read both return `null`
  identically. `runResearchAndGuide` wraps the research + guide-generation
  calls in one try/catch, calling `markPrepFailed` on any unexpected throw,
  per spec.
  - **Deviation from `ai-workflow-rules.md`'s "Protected Files" rule that
    `lib/types.ts` / `lib/validation.ts` change together:** added
    `InterviewPrepRecord` to `types.ts` without a
    matching new schema in `validation.ts`. Its two JSON-shaped fields
    (`researchFindings`, `guide`) already have dedicated schemas
    (`researchFindingsSchema`, `prepGuideSchema`) that `lib/db/preps.ts` uses
    directly when reading those columns — a third schema wrapping the whole
    record would just re-assert types Prisma's own generated types (`id`,
    `sessionId`, `status`, timestamps) already guarantee at compile time, with
    nothing new actually being validated. No user/model input flows through
    this type unvalidated.
  - Verified end to end against the real dev server (temporary
    `app/api/verify-tmp/route.ts`, removed after testing; one test
    `InterviewPrep` row cleaned up via `prisma db execute`): invalid input
    (`{ company: "", role: "" }`) returned `{ error }` and created no row;
    valid input returned `{ prepId }` immediately with the row's status still
    `"researching"` and both JSON columns still empty — confirming
    `createPrepAndRunAgent` returns before AI work runs; `getPrepById` with a
    fabricated session id and `getPrepById` with a fabricated prep id both
    returned `null` identically; `runResearchAndGuide` drove the row's status
    from `"researching"` to `"ready"`. Research/guide content itself came
    back as the honest fallback objects (`FALLBACK_FINDINGS`/`FALLBACK_GUIDE`)
    rather than real Zerodha content — consistent with the still-open Gemini
    free-tier daily-quota exhaustion already logged under `06`/`07`/`08`
    below, not a defect in this step's wiring; the "never throws" contract
    held end to end under that real quota failure. `npx tsc --noEmit` and
    `npm run build` both pass.
- `10-server-actions-interview.md` — `lib/db/turns.ts` (`listTurnsForPrep`,
  `appendTurn`) and `app/actions.ts`'s `submitInterviewAnswer` written exactly
  per spec. Added `candidateAnswerSchema` (`z.string().trim().min(1).max(5000)`)
  to `lib/validation.ts` to validate the candidate's answer before persisting,
  per code-standards.md's "every external input is validated with a Zod
  schema" rule — this schema doesn't mirror a `lib/types.ts` interface (it's a
  bare string parameter, not an object type), so the "types.ts/validation.ts
  change together" protected-file rule doesn't apply here.
  - Followed the same pattern already established by `09`'s
    `updatePrepResearch`/`markPrepFailed` (which take only `prepId`, no
    `sessionId`): `listTurnsForPrep`/`appendTurn` in `lib/db/turns.ts` take
    only `prepId`, matching the feature-spec's exact signatures. Session
    scoping is still fully enforced — `submitInterviewAnswer` calls
    `getPrepById(sessionId, prepId)` first and returns the error case before
    either turns function is ever reached, so there is no code path that
    reaches another session's turns.
  - Guarded against a `status === "ready"` row with a `null` guide (malformed
    JSON degrading via `parseJsonField`, see `09`'s `toRecord`) by treating
    that the same as "not ready" — `!prep.guide` is part of the same early
    return as the status check, which also narrows the type so `prep.guide`
    can be passed to `interviewTurn` without a null-check further down.
  - Verified end to end against the real dev server and Supabase DB (temporary
    `app/api/verify-tmp/route.ts`, removed after testing; all test rows
    cleaned up in the same request): a `"researching"`-status prep and a
    ready prep belonging to a *different* session both returned the identical
    `{ error: "This prep isn't ready yet." }` — confirming a caller can't
    distinguish "not found" from "not ready" from "not yours"; a ready prep
    with empty history and `candidateAnswer: null` produced a real,
    guide-grounded opening question from Gemini (correctly referencing the
    Zerodha order-book concept seeded in the test guide); submitting a
    candidate answer next correctly persisted the candidate turn before the
    interviewer call — the interviewer call itself hit the same already-open
    Gemini free-tier daily quota cap (`06`/`07`/`08` above) and fell through
    to `FALLBACK_MESSAGE`, a live re-confirmation of the "never throws"
    contract flowing correctly through this Server Action; a whitespace-only
    answer was correctly rejected by `candidateAnswerSchema` with no turn
    created; the final turn order read back from the database was
    `interviewer, candidate, interviewer`, ascending by `createdAt`, proving
    `listTurnsForPrep` reconstructs true persisted state rather than trusting
    client-passed history (the spec's core "why" for this step). Did not
    re-run the two-browser-tab manual check from the spec's "Verify" section
    (requires a running UI, not yet built — `16-mock-interview-chat-ui.md`);
    the database-level equivalent (re-fetching history mid-flow) was verified
    instead. `npx tsc --noEmit` and `npm run build` both pass.

- `11-design-system-setup.md` — verified the design-system setup done
  incidentally during the earlier create-next-app boilerplate cleanup (see
  "Completed" note above) already satisfied this spec almost entirely:
  `app/globals.css` is the correct Tailwind v4 single-line `@import
  "tailwindcss"`, no `tailwindcss.config.*` file exists (correct for v4
  zero-config), no `next/font/google` usage, and `app/layout.tsx`'s metadata
  already matches `project-overview.md`'s Overview paragraph. Only gap: the
  `antialiased` class the spec calls for was missing from `<html>` — added it
  to `app/layout.tsx`. `npx tsc --noEmit` and `npm run build` pass.
- `12-home-page-prep-list.md` — `components/PrepList.tsx` and `app/page.tsx`
  written. Added `lib/format.ts` (`formatRelativeTime`, using
  `Intl.RelativeTimeFormat`) for the spec's "relative created date, not a raw
  ISO string" requirement — a new file not in `code-standards.md`'s File
  Organization list, but the list wasn't exhaustive of every future
  cross-cutting helper. `PrepList` renders a muted status line
  ("Researching…" / "Generating guide…") for any non-`"ready"` status, in
  `text-red-400` specifically for `"failed"` (ui-context.md's Error color),
  and nothing extra for `"ready"`.
  - **Deviation from the spec's literal text, resolving the open question
    below:** the spec originally said `app/page.tsx` "calls
    `getOrCreateSession()` then `listPrepsForSession(id)` directly." Actually
    wiring that up would call `setSessionCookie()` from within a Server
    Component render for any brand-new visitor (no existing cookie) — exactly
    the case `03-session-identity.md` already proved throws in Next.js 16
    ("Cookies can only be modified in a Server Action or Route Handler").
    Resolved per this file's open question's option (a): `app/page.tsx` now
    calls the read-only `getSessionIdFromCookie()` only, and renders an empty
    `preps` array (not a crash) for a visitor with no cookie yet. The session
    row + cookie get created for real on the first Server Action call
    (`createPrepAndRunAgent`, which already calls `getOrCreateSession()`).
    Updated `12-home-page-prep-list.md` itself to describe the corrected
    behavior instead of the version that can't actually run.
  - Verified against the real dev server and Supabase DB (temporary
    `app/api/verify-tmp/route.ts`, removed after testing; all test rows
    cleaned up via its own `DELETE` handler in the same session): a fresh
    request with no cookie renders the empty-state message and sets no
    cookie, without crashing; three seeded `InterviewPrep` rows
    (`"ready"`/Zerodha, `"researching"`/Stripe, `"failed"`/Acme Corp) all
    rendered with the correct status treatment and correct `/prep/[id]`
    links, in newest-first order (Acme Corp, created last, appeared first),
    confirming `listPrepsForSession`'s own ordering is used with no
    client-side re-sort. `npx tsc --noEmit` and `npm run build` both pass.
- `13-new-prep-form.md` — `components/NewPrepForm.tsx` written exactly per
  spec: `useState` for the three fields, `useTransition` around
  `createPrepAndRunAgent`, submit disabled while company/role is empty or a
  submission is pending, `useRouter().push` to `/prep/[id]` on success, and
  the error message shown inline with the form's input left intact on
  failure. Implemented in the same step as `12` (rather than strictly
  afterward) because `12`'s own spec text requires `app/page.tsx` to render
  `<NewPrepForm />` — `12` cannot be verified end to end without it existing.
  - Verified: the server-rendered initial HTML has the submit button's
    `disabled` attribute present (company/role start empty), confirming the
    spec's first "Verify" bullet at the markup level. Full interactive
    (typing + submit) behavior was not driven through a real browser in this
    step — flagging rather than claiming full UI verification; the
    server-side wiring (`createPrepAndRunAgent` call, `router.push` target,
    error-vs-success branching) matches the already-verified
    `09-server-actions-preps.md` contract exactly. `npx tsc --noEmit` and
    `npm run build` both pass.

## In Progress

- None.

## Next Up

- `14-prep-page-and-guide-view.md`

## Open Questions

- `07-guide-generator.md`'s two-company `whyItMatters` comparison (spec
  "Verify" section / `19-manual-verification.md` item 4) is only half-done —
  one company (Zerodha) verified with strong, specific output; a second
  company (Google) was blocked by the Gemini free-tier's daily request cap
  (20/day), not a code issue. Re-run the comparison once the quota resets
  (next UTC day) and record the result here or in `19-manual-verification.md`
  before treating that verification item as closed.
- `08-mock-interviewer.md`'s same-session shallow-vs-strong divergence check
  (spec "Verify" section / `19-manual-verification.md` item 5) is only
  half-done for the same reason — the strong-answer branch was verified live,
  the shallow-answer branch in the same test session hit the same daily quota
  cap. Re-run alongside the `07` re-run once the quota resets, before treating
  that verification item as closed.
- **Resolved in `12-home-page-prep-list.md`:** picked option (a) — the home
  page renders fine without a cookie yet (empty state), and the cookie/session
  row get created for real on the first Server Action call. Option (b) (a
  `proxy.ts` pre-seeding every request) was not implemented. Residual
  consequence worth tracking: a visitor who only ever views the home page and
  never submits "New Prep" gets a fresh session on every visit (no stable
  identity until their first mutation) — acceptable for this app's anonymous,
  no-login model, but noting it here in case it surprises anyone reading
  session behavior later.

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
