# Progress Tracker

Update this file after every meaningful implementation change. This file, not
memory or assumption, is the source of truth for what's actually built.

## Current Phase

- `18-uiux-enhancement.md` fully done, including section 2 (Voice Interview
  Support), implemented as its own step — see the `2026-07-18: voice
  interview support` entry below. `19-Interview-panel-redesign.md` (renumbered
  from `22` — see the `2026-07-18: feature-specs renumbered` entry below) is
  also done. All feature-specs are now implemented.

## Current Goal

- All specs `01-database-schema.md` through `19-Interview-panel-redesign.md`
  implemented, per `ai-workflow-rules.md`. Former specs `19`
  (deployment-and-infra), `20` (demo-and-submission), and `21`
  (manual-verification) were removed by direct instruction (unstarted,
  hackathon-submission-specific content no longer needed) — see the
  `2026-07-18: feature-specs renumbered` entry below.

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
  confirms `ResearchInput`, `ResearchFindings`, `PrepConcept`, `PrepQuestion`,
  `PrepGuide`, `PrepStatus`, and `InterviewTurn` in `types.ts` have a
  corresponding Zod schema in `validation.ts`. `InterviewPrepRecord`
  intentionally has no schema of its own — it's a DB-shaped composite of
  already-validated pieces (`ResearchFindings`, `PrepGuide`, `PrepStatus`)
  plus DB-generated fields (`id`, `createdAt`, `updatedAt`), not a value that
  itself needs runtime validation.
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
    (item 3) and the (now-removed) manual verification checklist's item-4
    requirement that `whyItMatters` be company-specific rather than templated.
  - **Could not complete the planned two-company comparison** (item 4 also
    asks for `whyItMatters` to differ between two different companies for the
    same role): a second live call against Google hit the Gemini free-tier's
    hard daily cap (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`, limit
    20 requests/day, HTTP 429) — quota exhausted for the day by testing done
    across this step and `06-research-agent.md`, not a code defect. This
    doubled as a valid real-world confirmation of the "never throws" contract:
    the 429 correctly fell through the `catch` branch to `FALLBACK_GUIDE`
    rather than crashing. Re-run the second-company comparison once the daily
    quota resets, before treating the (now-removed) manual verification
    checklist's item 4 as fully closed. `npx tsc --noEmit` and `npm run build`
    both pass.
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
    "Verify" section / the (now-removed) manual verification checklist's item
    5, which wants both a shallow and a strong answer in the *same* session
    compared side by side):
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
    before treating the (now-removed) manual verification checklist's item 5
    as fully closed. `npx tsc --noEmit` and `npm run build` both pass.
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

- `14-prep-page-and-guide-view.md` — `app/prep/[id]/page.tsx` (Server
  Component: `getSessionIdFromCookie`, `getPrepById`, "Prep not found" state
  for a `null` result) and `components/PrepGuideView.tsx` (Client Component:
  mount-triggered `runResearchAndGuide`, 2s status polling, failed/in-progress/
  ready states, full guide rendering) written per spec. Implemented together
  with `15-markdown-export.md` and `16-mock-interview-chat-ui.md` in the same
  session since `14`'s own spec text requires rendering
  `<MockInterviewChat prepId={...} guide={...} initialTurns={...} />` below the
  guide — `14` cannot be verified end to end without it existing, the same
  reasoning `13` used for building alongside `12`.
  - **Resolved ambiguity (edited `14-prep-page-and-guide-view.md` in this
    step):** the spec only described `page.tsx` calling `getPrepById`, with no
    path for `initialTurns` to reach `MockInterviewChat`. `16`'s own Verify
    section requires turns to be "loaded via `initialTurns` from the Server
    Component," so `page.tsx` now also calls `listTurnsForPrep(id)` (empty
    array when not yet `"ready"`) and `PrepGuideView` takes an added
    `initialTurns` prop passed straight through.
  - **Deviation found via live testing, documented in `code-standards.md` and
    `architecture.md` in this step:** the spec suggested polling via either
    "a Server Action or a lightweight re-fetch of `getPrepById` equivalent."
    Built the Server Action version first (a `fetchPrep` action wrapping
    `getPrepById`) and it visibly failed under live testing — a real Zerodha/
    Stripe run stayed on "Researching the company…" for the entire ~20-40s of
    the `runResearchAndGuide` action, then jumped straight to the finished
    guide with zero "Writing your prep guide…" frames ever shown, confirmed via
    Playwright request-timing logs (the polling action's own network requests
    weren't even sent until the long-running action's response landed). Root
    cause: Next.js's client runtime dispatches every `"use server"` call from
    a page through one sequential action queue, so the polling action queued
    behind the in-flight `runResearchAndGuide` call instead of running
    concurrently. Fixed by replacing the polling action with a plain
    read-only Route Handler (`app/api/prep/[id]/route.ts`, `GET`), polled via
    `fetch()` from the client — this bypasses the action queue entirely, since
    it's not a `"use server"` dispatch. Re-verified: a fresh Stripe run showed
    the live "Researching…" → "Writing your prep guide…" → full guide
    progression with no manual refresh. Documented as a narrow, explicit
    exception to the "Server Actions only" rule in both `code-standards.md`
    and `architecture.md` (the rule's own intent — no mutation, no AI-provider
    call from the client — was never actually violated by this fix).
  - Verified end to end against the real dev server, real Gemini API, and real
    Supabase DB (Playwright driving a real headless Chromium; all test rows
    cleaned up via a temporary `app/api/verify-tmp/route.ts` `DELETE` handler,
    removed after testing, same pattern as earlier steps):
    - A fresh Stripe/Software-Engineer prep showed the live status
      progression described above, then rendered a full guide with real,
      company-specific research (correctly describing Stripe's payment
      infrastructure, its multi-round interview process, and its culture)
      and 6+ concepts/9+ questions with real resource links — satisfying this
      spec's Verify section.
    - `/prep/<bogus-id>` with a session cookie that owns no such prep rendered
      the "Prep not found" state with a working link back to `/`, not a
      framework 404.
    - A prep seeded directly to `"failed"` status rendered the error state
      with a "Try again" button; clicking it optimistically flipped the UI to
      "Researching the company…" and re-invoked `runResearchAndGuide`.
    - `15-markdown-export.md`: clicking "Download Markdown" on a real
      Figma/Frontend-Engineer guide produced `figma-interview-prep.md` with
      correctly structured headers, a research-summary section, a concepts
      section with linked resources, and a questions section with category +
      hint — file content inspected directly, not just download-triggered.
    - `16-mock-interview-chat-ui.md`: clicking "Start Mock Interview" on a
      Notion/Product-Engineer guide produced a real, guide-grounded opening
      question (referencing Notion's real-time collaborative editing);
      submitting a detailed CRDT-based answer produced optimistic candidate
      turn placement followed by a genuinely adaptive follow-up question
      (asking to go deeper into specific CRDT types) — confirming the
      interviewer agent's adaptive behavior end to end through the UI, not
      just at the `lib/ai/` layer as in `08`. Refreshing the page
      mid-conversation reproduced the exact same turn history, confirming
      `initialTurns` (not client state) is the source of truth on reload.
    - `npx tsc --noEmit` and `npm run build` both pass.

- `17-error-and-loading-states.md` — audited all three Server-Action call
  sites (`NewPrepForm.tsx`, `PrepGuideView.tsx`, `MockInterviewChat.tsx`)
  against the spec's five rules. `NewPrepForm.tsx` and `MockInterviewChat.tsx`
  already satisfied all five (built that way from `13`/`16`) — no changes
  needed. `PrepGuideView.tsx` had two gaps, fixed in this step:
  - Its two `runResearchAndGuide` call sites (the mount effect and
    `handleRetry`) called the Server Action directly, not wrapped in
    `startTransition` — added a `useTransition` pair and wrapped both, so the
    "Try again" button now disables and reads "Retrying…" while pending
    (matches the existing `NewPrepForm`/`MockInterviewChat` pattern).
  - `runResearchAndGuide` (`app/actions.ts`) could throw before entering its
    own try/catch if `getPrepById` failed, violating rule 2's "never throws
    across the Server Action boundary" — widened the try/catch to cover the
    whole body after `getOrCreateSession` (consistent with why `06`/`07`/`08`'s
    `lib/ai/*` functions are designed to never throw: any failure now reaches
    `markPrepFailed`, so the already-existing `status === "failed"` UI is the
    single source of truth for this failure, rather than requiring a second,
    parallel error-reporting path). Added a client-side `catch` around both
    call sites as a last-resort safety net (flips local `prep.status` to
    `"failed"` if the action call itself rejects) and a `try/catch` around the
    status-poll `fetch` in the second `useEffect`, so a network throttle
    during polling can't produce an unhandled rejection or a silently stuck
    loading state.
  - Verified end to end against the real dev server and Supabase DB, driven
    by a headless Chromium via Playwright (temporary `app/api/verify-tmp/
    route.ts`, removed after testing; a temporary standalone Playwright
    install in the scratchpad directory, not added to the project's
    `package.json`; all seeded rows — two `InterviewPrep` rows and one
    `Session` row — cleaned up via the temp route's own `DELETE` handler in
    the same run): a company name over the 200-char limit correctly returned
    `createPrepAndRunAgent`'s `{ error: "Please provide a valid company name
    and role." }`, rendered inline in red with the form's values retained and
    the submit button re-enabled — a real forced Server Action failure
    reachable through the actual UI, not a simulated one. A prep seeded
    directly to `status: "failed"` rendered the styled error card; clicking
    "Try again" visibly disabled the button and showed "Retrying…" (confirmed
    in a screenshot, not just a DOM query — an initial text-locator assertion
    taken at the same instant raced the render and returned a false negative,
    but the screenshot is unambiguous), then transitioned to the
    "Researching the company…" loading-shape card, confirming no stuck or
    blank state. A prep seeded directly to `status: "ready"` with a fabricated
    guide reached `MockInterviewChat`; "Start Mock Interview" produced a real
    Gemini-generated opening question (this run's dev server used the real
    `GEMINI_API_KEY`, so this also incidentally re-confirmed the happy path);
    submitting a 5001-character answer correctly hit `candidateAnswerSchema`'s
    max-length validation, returned `{ error: "Please provide an answer
    before submitting." }`, rolled back the optimistic candidate turn, and
    left the input and Send button enabled as the way forward. `npx tsc
    --noEmit` and `npm run build` both pass.
  - **Scope note:** did not touch `MockInterviewChat.tsx`'s existing behavior
    of clearing the draft input before the request resolves (so a rejected
    answer must be retyped rather than restored) — it already satisfies the
    spec's "never a dead end" bar (the input stays enabled and empty, ready
    for input) and the file wasn't otherwise in scope for this step; flagging
    here in case it's worth a follow-up UX polish later.

- `18-uiux-enhancement.md` — full professional redesign implemented, sections
  1, 3, 4, 5, 6 (section 2, Voice Interview Support, explicitly out of scope
  for this step — see Open Questions).
  - **Theme system (section 4):** added `lib/theme.ts` (theme list/type,
    `localStorage` key, `THEME_INIT_SCRIPT`) and rewrote `app/globals.css`
    with per-theme CSS custom properties (`dark`/`midnight`/`graphite`/`light`)
    mapped into Tailwind v4 color utilities via a top-level `@theme inline`
    block — this is what makes `bg-surface`/`text-fg`/etc. repaint instantly
    on `data-theme` change with no rebuild and no React re-render of color
    values. `components/ThemeSwitcher.tsx` (in the new navbar) reads/writes
    `localStorage` and sets `data-theme`; a blocking inline `<script>` in
    `app/layout.tsx`'s `<head>` applies the stored theme before first paint to
    avoid a flash of the wrong theme. **This supersedes `ui-context.md`'s
    original "dark only, no light mode" decision and its "Tailwind's built-in
    neutral/blue scales... rather than introducing custom CSS variables"
    decision** — both rewritten in `ui-context.md` in this step, since the
    spec explicitly requires 4 switchable themes including a light theme.
  - **New shared primitives (section 5):** `components/ui/Button.tsx` (5
    variants), `Card.tsx`, `Field.tsx` (`Input`/`Textarea`/`Label`),
    `Skeleton.tsx`, `EmptyState.tsx`, `Toast.tsx` (`ToastProvider` +
    `useToast()`). Added `framer-motion` (page transitions, chat bubble/typing
    indicator animation, toast enter/exit, theme-dropdown, progress-bar width)
    and `lucide-react` (navbar/breadcrumb/chat icons) as new dependencies —
    both anticipated by `ui-context.md`'s pre-`18` text ("if icons are needed
    later, use lucide-react") or explicitly suggested by the spec itself
    (Framer Motion). Did not add a full component library (shadcn/ui etc.) —
    the spec doesn't require one and `ui-context.md`'s "intentionally small"
    reasoning still holds for a project this size; a handful of primitives
    was enough.
  - **Navigation (section 3):** `components/Navbar.tsx` (sticky, logo, theme
    switcher, decorative session badge — no real avatar/profile menu since
    there's no account system per `project-overview.md`) and
    `components/PrepBreadcrumb.tsx` (back-to-home link + `Home → {Company}
    Interview` breadcrumb on `/prep/[id]`) — two levels, not three, since
    there's no separate "Companies" listing page in this app's architecture.
  - **Chat redesign (section 1):** `components/MockInterviewChat.tsx` rewritten
    as alternating bubbles (interviewer left/`bg-surface-hover`, candidate
    right/`bg-accent`), per-message timestamp caption, auto-scroll-to-latest
    via a bottom sentinel ref, a typing-indicator bubble (3 animated dots)
    while the interviewer's turn is generating, a multi-line `Textarea` (Enter
    sends, Shift+Enter inserts a newline — `onKeyDown` only intercepts plain
    Enter), and a slim progress bar (question count vs. `guide.questions.length`,
    a live `mm:ss` elapsed timer started from the first turn's `createdAt`,
    completion %). Existing optimistic-turn/error/retry behavior from
    `16`/`17` preserved as-is, now also routed through `useToast()` for error
    surfacing in addition to the existing inline red text.
  - **UX enhancements (section 6):** `components/ui/Toast.tsx` wired into
    `NewPrepForm`/`PrepGuideView`/`MockInterviewChat` for success/error
    surfacing alongside (not replacing) existing inline error text;
    `components/PageTransition.tsx` (mounted once in `app/layout.tsx`, keyed
    on `usePathname()`) for page-level fade-in. Keyboard shortcuts scoped to
    what the spec's chat section asked for (Enter/Shift+Enter) rather than
    inventing app-wide shortcuts not described anywhere in `context/`.
  - **Deviation found via live testing, fixed in this step:** the no-flash
    `THEME_INIT_SCRIPT` (see Theme system above) sets `data-theme` on
    `<html>` before React hydrates, but the server-rendered markup has no
    such attribute — React 19 flagged this as a hydration mismatch on
    `<html>` (visible in the dev overlay: "server rendered HTML didn't match
    the client properties... `data-theme="midnight"`"). This is the same
    known tradeoff every no-flash theme script has (e.g. `next-themes`).
    Fixed by adding `suppressHydrationWarning` to the `<html>` element in
    `app/layout.tsx` — this only silences the warning for that element's own
    attributes, not its children, so it doesn't mask unrelated hydration bugs
    elsewhere in the tree.
  - Two React-hooks lint errors surfaced by `npm run lint`
    (`react-hooks/set-state-in-effect`) in `ThemeSwitcher.tsx` (syncing React
    state from a `data-theme` attribute the pre-hydration script already set —
    unknowable at SSR time) and `MockInterviewChat.tsx` (initializing the
    live elapsed-time clock before the `setInterval` takes over) — both are
    genuine external-system synchronization, not derivable state, so both
    have a targeted `eslint-disable-next-line` with an inline comment
    explaining why, rather than a blanket disable.
  - Updated `ui-context.md` (Theme, Colors, Typography, Border Radius,
    Component Library, Layout Patterns, Icons sections all revised) and
    `code-standards.md` (File Organization, Styling sections) in this same
    step, per `ai-workflow-rules.md`'s "Keeping Docs in Sync" rule.
  - Verified: `npx tsc --noEmit`, `npm run build`, and `npm run lint` all pass
    clean. Browser-driven visual verification (all 4 themes, full mock
    interview chat flow, responsive breakpoints) was not completed in this
    step — the user declined the browser-automation tool this step attempted
    to use for that check. **Flagging explicitly, not claiming full UI
    verification**: someone should open the app in a real browser before
    treating this step as fully done, per `ai-workflow-rules.md`'s "verified
    end to end, not just compiles/type-checks" bar.

- `19-Interview-panel-redesign.md` (numbered `22` at the time, before the
  `2026-07-18: feature-specs renumbered` cleanup below) — implemented ahead of
  the main `01`→`18` sequence per direct instruction (a UI-only redesign, no
  `lib/ai/`/`lib/db/`/`app/actions.ts` diff). New files: `lib/panel-state.ts`
  (localStorage open/width helpers), `components/InterviewHeroCTA.tsx`,
  `components/InterviewPanel.tsx` (resizable side panel / full-viewport focus
  mode / mobile full-view host, focus trap, Escape handling, drag + arrow-key
  resize). Modified: `components/PrepGuideView.tsx` (now the sole owner of
  panel-open/focus-mode/mobile-tab state — see below), `components/
  MockInterviewChat.tsx` (`aria-live="polite"` on the messages container,
  reserved empty mic-icon slot — no prop/behavior change),
  `app/prep/[id]/page.tsx` (dropped its own `max-w-3xl mx-auto`, now a plain
  full-width relative container so the fixed panel's math has the true
  viewport to work against).
  - **Resolved ambiguities, edited in the same step (per
    `ai-workflow-rules.md`):** this spec predated `18-uiux-enhancement.md`'s
    semantic-token/emoji-free-icon system — every raw `bg-neutral-900`/
    `bg-blue-600`/emoji in the original draft was replaced with its semantic-
    token/`lucide-react` equivalent (`bg-surface`, `border-border`, `Rocket`/
    `Bot` icons, a `bg-success` dot for the 🟢 indicator). Added
    `components/PrepGuideView.tsx` to Modified Files (the original draft
    didn't name it) since it's the only existing component that could own the
    new `localStorage`-backed UI state — `page.tsx` is a Server Component and
    can't. The Hero CTA's and panel header's "Question n of total" both read
    from the `initialTurns` snapshot (same one `MockInterviewChat` starts
    from) rather than a live subscription into `MockInterviewChat`'s internal
    state — lifting that state would have required changing
    `MockInterviewChat`'s props, which the spec explicitly prohibited.
  - **Bug found and fixed during browser verification, not just type-check:**
    the mobile "Interview" tab initially rendered `InterviewPanel` in normal
    document flow (not `fixed`), so it appeared *below* the still-mounted
    breadcrumb instead of replacing it, and `PrepBreadcrumb` (rendered
    directly by `page.tsx`, outside `PrepGuideView`'s mobile-tab-aware
    content) stayed mounted and in the tab order behind it — violating the
    "hidden entirely, out of tab order" rule mobile inherits from desktop
    focus mode. Fixed by (1) making the mobile panel `fixed inset-x-0 top-14
    bottom-14` (bounded by the navbar height and the tab bar height) instead
    of flowing normally, and (2) moving `PrepBreadcrumb` ownership from
    `page.tsx` into `PrepGuideView` itself (rendered in every status branch,
    gated by the same `showPrepContent` flag as the rest of the prep column
    in the ready branch) — confirmed via Playwright that `text=Back to Home`
    has zero matches while the mobile Interview tab is active and reappears
    on switching back.
  - Verified end to end against the real dev server and a real seeded ready
    prep (Deloitte/Frontend React Developer, 8-question guide, 6 turns
    already recorded) via a temporary standalone Playwright install in the
    scratchpad directory (same pattern as `17`'s verification), driving a
    real headless Chromium — not just `tsc`/`build`:
    1. Hero CTA → expanded panel: prep content (including Research Summary)
       stayed visible and unobstructed to its left, confirmed by bounding-box
       math (no overlap at 1280px viewport with the default 34vw width).
    2. Expand-to-focus: `Research Summary`'s DOM node count dropped to 0
       (actually unmounted, not just hidden) while focus mode was active;
       `Escape` returned to expanded and the node reappeared.
    3. Keyboard resize (arrow keys on the `role="separator"` handle, the
       accessible equivalent of drag) moved the panel from its default
       ~435px to exactly 467px (two 16px steps); confirmed the value survived
       a full page reload and restored into **expanded**, never focus mode.
    4. Panel open moved focus to the in-progress interview's answer
       `<textarea>` (confirmed via `document.activeElement.tagName`); closing
       the panel returned focus to the Hero CTA button (confirmed via its
       text content).
    5. At a 375px mobile viewport: the bottom `Preparation`/`Interview` tab
       bar appeared, no split/side-panel layout ever rendered, and the
       resize-handle `role="separator"` element count was 0 (mobile never
       renders it).
    6. Zero browser console errors across the whole flow.
    - **Not separately verified:** a real assistive-technology screen reader
      reading the `aria-live="polite"` announcement out loud (spec item 4) —
      the DOM attribute is in place and Playwright confirmed the messages
      container carries it, but no screen-reader-specific tooling was run
      against it this step.
  - `npx tsc --noEmit`, `npm run lint`, and `npm run build` all pass clean.

- `20-fix-and-delete-prep.md` (numbered `23` at the time, before the
  `2026-07-18: feature-specs renumbered` cleanup below; no standalone spec file
  was ever written for this step — the bundled fixes were given as a direct
  instruction) — bundled fixes, done, implemented and verified in order:
  - **Fix 1** (message role alternation bug): the spec's code sample assumed
    the Anthropic API; this codebase's `lib/ai/mock-interviewer.ts` actually
    uses the Gemini SDK (`genAI.models.generateContent` with `contents` /
    `parts`, roles `"user"`/`"model"`), not Anthropic — applied the same fix
    intent (always prepend a synthetic seed message with role `"user"`,
    unconditionally, not just when `history` is empty) using the correct
    Gemini shapes. Root cause was identical to the spec's description: Gemini
    also rejects `contents` arrays that don't start with role `"user"`, and
    `history`'s first entry from the second turn onward is the interviewer's
    opening question (`"interviewer"` → `"model"`).
  - **Fix 2** (error logging): added `console.error` with a
    `[mock-interviewer]` / `[research-agent]` / `[guide-generator]` prefix
    before every fallback-return point in all three `lib/ai/*.ts` files (not
    just the `catch` blocks — also the non-`"STOP"`/empty-response branches,
    JSON-parse failures, and Zod validation failures).
  - **Fix 3** (remove timer/"Question X of Y"): removed from
    `InterviewPanel.tsx` and `MockInterviewChat.tsx` (including the
    `elapsedMs`/`startedAt` ticking clock and the progress bar tied to
    `totalQuestions`). `InterviewHeroCTA.tsx`'s resume state now reads
    "Resume Interview — N exchange(s) so far" (interviewer-turn count, no
    denominator). Since `guide` became unused as a result in
    `MockInterviewChat.tsx`, `InterviewPanel.tsx`, and `InterviewHeroCTA.tsx`,
    removed that prop from all three (and their call sites in
    `PrepGuideView.tsx`) rather than leaving it dead.
  - **Fix 4** (delete button): `lib/db/preps.ts`'s `deletePrep`,
    `app/actions.ts`'s `deletePrepAction`, and `PrepList.tsx`'s per-card
    delete affordance (inline confirm state, not `window.confirm`) written
    exactly per spec.
  - Verified: `npx tsc --noEmit` and `npm run build` both pass.
    `lib/ai/mock-interviewer.ts`'s fix was verified structurally (a
    Playwright-driven live 3-turn conversation was attempted but the Gemini
    free-tier daily quota — see the `07`/`08` open questions below — was
    already exhausted mid-session; the new Fix 2 logging correctly surfaced
    the `429 RESOURCE_EXHAUSTED` cause instead of a silent fallback, which is
    itself a live verification of Fix 2). In place of the live run, a
    monkey-patched capture of the exact request payload sent to
    `genAI.models.generateContent` confirmed `contents[0].role === "user"`
    both for empty history and for a second-turn history that starts with an
    `"interviewer"` turn — the precise case the bug was in. Fix 3 verified
    visually via a live Playwright screenshot (no timer/countdown/"X of Y"
    text anywhere in the panel). Fix 4 verified against the real Supabase DB:
    a wrong-`sessionId` delete attempt correctly no-ops (`false`, row
    untouched), a correct-`sessionId` delete removes the prep row and
    cascade-deletes its `InterviewTurn` rows (checked a prep with 7 existing
    turns directly), and a full browser-driven delete (click → inline
    confirm → Delete → optimistic removal → hard page reload) confirmed the
    card stays gone after refresh.
  - **Follow-up worth a future look, not part of this spec:** while testing,
    triggering a delete for a prep whose `runResearchAndGuide` background
    call was still in flight surfaced a latent, narrow race: if that prep's
    row is deleted mid-flight, `updatePrepResearch`/`updatePrepGuide` throw
    (row gone), which is caught by `runResearchAndGuide`'s try/catch, which
    then calls `markPrepFailed(prepId)` — which *also* throws for the same
    reason, and that second throw is unhandled (logged as a server error, not
    user-visible, no data corruption since the row is legitimately gone).
    Harmless today but worth a `try/catch` (or a `deleteMany`-style no-op)
    around `markPrepFailed` if this pattern becomes more common.

## In Progress

- None.

## Next Up

- None — all feature-specs (`01` through `19-Interview-panel-redesign.md`)
  implemented.

## Open Questions

- `07-guide-generator.md`'s two-company `whyItMatters` comparison (spec
  "Verify" section / the now-removed manual verification checklist's item 4)
  is only half-done — one company (Zerodha) verified with strong, specific
  output; a second company (Google) was blocked by the Gemini free-tier's
  daily request cap (20/day), not a code issue. Re-run the comparison once the
  quota resets (next UTC day) and record the result here before treating that
  verification item as closed.
- `08-mock-interviewer.md`'s same-session shallow-vs-strong divergence check
  (spec "Verify" section / the now-removed manual verification checklist's
  item 5) is only half-done for the same reason — the strong-answer branch
  was verified live, the shallow-answer branch in the same test session hit
  the same daily quota cap. Re-run alongside the `07` re-run once the quota
  resets, before treating that verification item as closed.
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

## 2026-07-18: mock interviewer moved to LITE_MODEL

- `lib/ai/client.ts` gained a `generateContentLite` export calling
  `LITE_MODEL` (`gemini-2.5-flash-lite`) directly, no `MODEL` attempt first.
  `lib/ai/mock-interviewer.ts` now calls this instead of `generateContent`.
  Reason: the interview makes one Gemini call per turn, so a single
  multi-turn session was exhausting `MODEL`'s 20/day free-tier cap by
  itself (and via the fallback-on-429 path, doubling up as extra calls to
  `LITE_MODEL` anyway) — starving `research-agent.ts`/`guide-generator.ts`
  of the quota they need for new preps. Research and guide generation still
  use `MODEL` (`generateContent`, one call each per prep, quality-sensitive).
  `05-ai-client-setup.md` and `08-mock-interviewer.md` updated to match.
  `npx tsc --noEmit` passes; not yet re-verified against the live API (would
  itself consume quota) — next real interview session is the practical test.

## 2026-07-18: MODEL/LITE_MODEL switched to the "-latest" aliases

- Live testing on a newly created API key hit `HTTP 404 "This model
  models/gemini-2.5-flash is no longer available to new users"` on every
  `research-agent.ts`/`guide-generator.ts` call — confirmed via a throwaway
  script hitting `genAI.models.generateContent` directly for both
  `gemini-2.5-flash` and `gemini-2.5-flash-lite` (both 404 for this key).
  `genAI.models.list()` still lists both as if callable, which is misleading.
  `gemini-flash-latest` and `gemini-flash-lite-latest` both succeeded for the
  same key. `lib/ai/client.ts`'s `MODEL`/`LITE_MODEL` changed to those two
  aliases; `05-ai-client-setup.md` and `08-mock-interviewer.md` updated to
  match, including a note on why pinned dated versions rot for new accounts.
  No other file hardcodes a model string (grepped `gemini-2\.5-flash` across
  the repo — only the two spec files and `client.ts` matched, all now fixed).
  `npx tsc --noEmit` passes; verified live via a temporary script (not
  committed) that both aliases return `200`/real text for this API key.

## 2026-07-18: migrated AI provider from Gemini to OpenAI

- Billing is now enabled on an OpenAI account with a real `OPENAI_API_KEY` in
  hand, and the Gemini free-tier daily quota caps had already forced several
  workarounds above (`LITE_MODEL` routing, `-latest` aliases, blocked
  same-session comparison tests) — billed OpenAI access removes that
  friction entirely. Separately, the hackathon's model-provider branding
  favors OpenAI for this submission, reinforcing the same move.
- `package.json`: removed `@google/genai`, added `openai` (official Node SDK,
  `^6.48.0`).
- `lib/ai/client.ts`: replaced the `GoogleGenAI` client with `OpenAI`, reading
  `process.env.OPENAI_API_KEY` (only file that reads it, same rule as
  before). `MODEL`/`LITE_MODEL` renamed from the Gemini names to `"gpt-5.4"`
  and `"gpt-5.4-mini"`. `generateContent`/`generateContentLite` keep their
  same exported shape and fallback-on-429 behavior, now wrapping
  `openai.chat.completions.create` instead of
  `genAI.models.generateContent`. `gpt-5.4-mini`, not the smaller
  `gpt-5.4-nano`, was picked for the mock interviewer's tier — nano is sized
  for classification/completion, and the interviewer's adaptive follow-up
  questioning needs real judgment about answer quality.
- `guide-generator.ts`: adapted to `response.choices[0].message.content` /
  `response.choices[0].finish_reason === "stop"`. Gemini's `responseMimeType:
  "application/json"` became `response_format: { type: "json_object" }`.
  Still calls `generateContent` (Chat Completions), unchanged from the
  initial migration plan.
- `research-agent.ts`: **not** on Chat Completions — live testing against the
  real API found that Chat Completions' `web_search_options` (the intended
  replacement for Gemini's `tools: [{ googleSearch: {} }]` grounding) is only
  accepted by dedicated search models (`gpt-4o-search-preview`,
  `gpt-5-search-api`), not by `MODEL` (`gpt-5.4`) itself — confirmed via a
  live 400 `"Unknown parameter: 'web_search_options'"` and cross-checked with
  direct curl calls to both endpoints. `MODEL` only gets real web search
  grounding through the Responses API's `tools: [{ type: "web_search" }]`,
  also confirmed live. Given a choice between (a) Responses API for this file
  only, keeping `MODEL`/`LITE_MODEL` and real search grounding, (b) downgrading
  this file to a dedicated search model instead of `MODEL`, or (c) dropping
  live search entirely, picked (a) — user's call, since it's the only option
  that keeps both the top-tier model and the spec's core anti-fabrication
  search requirement intact. `client.ts` gained a third export,
  `generateSearchContent`, wrapping `openai.responses.create` with the same
  fallback-on-429 shape as `generateContent`. `research-agent.ts` now reads
  `response.output_text` / `response.status === "completed"` instead of a
  Chat Completions shape. `guide-generator.ts` and `mock-interviewer.ts` are
  unaffected. `05-ai-client-setup.md` and `06-research-agent.md` updated to
  match.
- `mock-interviewer.ts`: roles remapped `user`/`model` → `user`/`assistant`;
  the system instruction moved from a separate config field to a
  `{ role: "system", ... }` message at the start of `messages`. Removed the
  synthetic "Let's begin the mock interview." seed message — that workaround
  existed only because Gemini's `contents` array had to start with role
  `"user"`; OpenAI's `messages` array accepts a system message followed
  directly by an assistant message with no such constraint.
- `.env` / `.env.example`: `GEMINI_API_KEY` → `OPENAI_API_KEY`.
- Updated every Gemini-specific reference in `README.md`, `architecture.md`,
  `code-standards.md`, `project-overview.md`, and feature-specs `05`–`08`,
  `19-deployment-and-infra.md`, and `21-manual-verification copy.md` to match
  (SDK name, env var name, model names, response-shape details) — both of
  those last two files were later removed, see the
  `2026-07-18: feature-specs renumbered` entry below. Entries above this one
  in this file describe Gemini-era state as it was true at the time and were left
  as-is rather than rewritten — this is a historical log, not living
  documentation.
- Verified: `grep -riE "gemini|google.?genai|GoogleGenAI"` across the repo
  (excluding `node_modules`/`.git`) returns zero hits outside this file's own
  historical entries above; `grep -rn "process.env.OPENAI_API_KEY"` returns
  exactly one hit, in `client.ts`. `npx tsc --noEmit` and `npm run lint` pass
  clean. Live-verified end to end against the real OpenAI API: a real-company
  `runResearch` call, a `generateGuide` call off that research, and one
  `interviewTurn` call all returned real (non-fallback) output.

## 2026-07-18: voice interview support (`18-uiux-enhancement.md` section 2)

- Implemented the previously-deferred voice input / optional TTS section as
  its own step. `components/MockInterviewChat.tsx`'s reserved empty slot
  (`19-Interview-panel-redesign.md`'s "Explicitly cut" mic icon) now hosts a
  real mic button; a new TTS toggle sits next to the "Mock Interview" heading.
- `lib/speech-recognition-types.ts` (new): minimal ambient interfaces for
  `SpeechRecognition`/`webkitSpeechRecognition` (not in default
  `lib.dom.d.ts`), plus `getSpeechRecognitionConstructor()` — kept to just
  the members this app uses rather than a full `@types/*` dependency, per
  the "no `any`" rule.
  `lib/tts-preference.ts` (new): `localStorage` get/set for the TTS toggle,
  same SSR-safe shape as `lib/theme.ts`/`lib/panel-state.ts`.
- Design choice: the voice transcript writes directly into the existing
  `draft` state (`setDraft(base + " " + transcript)`, replacing on each
  `onresult` since `interimResults` already gives the cumulative
  transcript-so-far) rather than a separate interim-transcript field — so
  `send()`, `handleKeyDown`, and the `Textarea`'s existing `value`/`onChange`
  needed no changes, and "user can edit before sending" falls out for free
  from the already-editable `draft` state.
  `send()` now force-stops any live recognition instance first (clearing its
  handlers before `.stop()`) so a late `onresult` can't repopulate `draft`
  after an optimistic turn was already sent and the field cleared.
- Fallback: unsupported browsers (Firefox has no `SpeechRecognition`; also
  covers a `not-allowed`/`service-not-allowed`/`audio-capture` permission
  error) render the mic button visibly disabled with a `title` tooltip,
  keeping the reserved `size-9` slot's width intact rather than reintroducing
  the layout jump that reservation was meant to prevent. Same pattern reused
  for the TTS toggle when `speechSynthesis` is absent.
  TTS toggle reads new interviewer turns aloud via
  `SpeechSynthesisUtterance` when enabled, tracked via a
  last-spoken-index ref so it never replays `initialTurns` on mount or
  speaks the candidate's own turn.
- Two `react-hooks/set-state-in-effect` lint errors from the mount-time
  feature-detection effect (browser support and `localStorage` aren't
  knowable at SSR time) — same category already present in
  `ThemeSwitcher.tsx`, fixed the same way: a single targeted
  `eslint-disable-next-line` with an inline comment (the other two `setState`
  calls in the same effect didn't need their own directive — lint only
  flagged the first).
- Verified: `npx tsc --noEmit`, `npm run lint`, `npm run build` all pass
  clean. End-to-end browser verification via a temporary standalone
  Playwright install in the scratchpad directory (same pattern as steps
  `17`/`19`/`20`) driving real headless Chromium against the dev server, with
  a temporary `app/api/verify-tmp/route.ts` (removed after testing) that
  seeded a `"ready"` prep with a fabricated guide and one interviewer turn
  (avoided spending AI quota — this step touches no `lib/ai/` code):
  - Supported-browser path: mic button renders with the `lucide-mic` icon,
    `aria-label="Start voice input"`, not disabled; clicking it calls
    `recognition.start()` without throwing or logging any console error,
    flips to the `lucide-mic-off` icon and the `border-danger
    bg-danger/10 text-danger` recording style. TTS toggle switches
    `VolumeX` → `Volume2` on click and persists `true` to
    `localStorage["interview-tts-enabled"]`.
  - Fallback path: with `window.SpeechRecognition` /
    `webkitSpeechRecognition` / `speechSynthesis` deleted via
    `page.addInitScript` (simulating Firefox), both the mic button and TTS
    toggle render disabled with the correct `title` tooltip, in the exact
    same screenshot layout as the supported case (no width/position shift).
  - Zero browser console errors in either path.
  - **Verification ceiling, flagged explicitly, not claimed as covered**:
    headless Chromium has no real audio input and this repo has no
    `--use-fake-device-for-media-stream` setup, so actual recognized speech
    becoming text, and actual synthesized audio being audible, were **not**
    verified by automation — only that the feature-detection, click
    handlers, visual state changes, and fallback rendering all work without
    error. A real-microphone pass in Chrome (and a Firefox fallback spot
    check) is still worth doing manually before fully closing this out,
    consistent with how this repo treats "compiles" vs. "verified end to
    end" everywhere else in this file.
  - All seeded rows (one `Session`, one `InterviewPrep`, one `InterviewTurn`)
    deleted via the temp route's own `DELETE` handler in the same session;
    the temp route file itself removed afterward. `git status` confirms only
    the intended files changed.
- **Bug found from a real-browser screenshot after this step, not caught by
  the headless Playwright pass above** (its low-resolution element crop
  masked it — only checking the SVG's class name, not its actual visible
  pixels, gave a false pass): the mic button rendered as a near-empty box
  with only a sliver of the icon visible. Root cause: it used the shared
  `components/ui/Button.tsx` primitive with a fixed `size-9` plus a `p-0`
  override, but `Button`'s `md` size already applies `px-4 py-2`, and
  Tailwind's generated stylesheet order (not the `className` string's
  left-to-right order) decides which same-specificity utility wins — here
  `px-4 py-2` won over `p-0`, leaving only ~4px of content width inside a
  fixed 36px box for a 16px icon. `components/InterviewPanel.tsx` had
  already solved this exact class of problem for its own icon-only controls
  (`Maximize2`/`X` buttons) by not using the `Button` component at all for
  icon buttons — a raw `<button>` with `inline-flex size-8 items-center
  justify-center` and no competing padding utility. Fixed both the mic
  button and the TTS toggle the same way: raw `<button>` elements, no
  `Button` import for either, matching `InterviewPanel.tsx`'s established
  convention (mic: bordered `size-9`, outline-style, `border-danger
  bg-danger/10 text-danger` while recording; TTS: borderless `size-8`,
  `text-accent` when enabled). Re-verified visually via the same temporary
  Playwright setup — the icon renders fully visible in both idle and
  recording states, and `npx tsc --noEmit`/`npm run lint`/`npm run build`
  all still pass. **Lesson for future icon-only buttons**: don't use
  `Button` with a `size-*`+`p-0` override; use a raw `<button>` matching
  `InterviewPanel.tsx`'s pattern, and verify with a real (or
  element-cropped-and-actually-viewed) screenshot, not just a DOM
  attribute/class-name check.

- **Race condition found via code review, not a feature-spec step**:
  `runResearchAndGuide` (`app/actions.ts`) had no server-side guard against
  running twice for the same prep — a remounted `PrepGuideView` effect
  racing a manual retry click (or two tabs open on the same prep) could both
  reach the function while `status` was still `"researching"`/`"failed"`
  and both call Gemini concurrently. Fixed with an atomic claim: added a
  nullable `claimedAt` column to `InterviewPrep`
  (`prisma/migrations/20260718160121_add_prep_claimed_at`) and
  `claimPrepForResearch` in `lib/db/preps.ts`, which does a single
  `updateMany({ where: { id, claimedAt: null }, data: { status:
  "researching", claimedAt: now() } })` — only the caller that actually
  flips `claimedAt` from `null` proceeds; everyone else returns immediately.
  `updatePrepGuide`/`markPrepFailed` clear `claimedAt` back to `null` on the
  terminal writes so a later retry can re-claim. `status` alone couldn't
  serve as this gate because it stays `"researching"` for the entire
  in-flight duration, not just at the start. Verified with a standalone
  script hitting the real Supabase dev DB: three concurrent claim attempts
  on the same row produced exactly one winner, and a claim after
  `markPrepFailed` (simulating retry) succeeded. `npx tsc --noEmit` and
  `npm run build` both pass. Left `PrepGuideView.tsx`'s client-side
  `startedRef`/optimistic retry state as-is — it's now just a UI nicety, not
  the correctness boundary.

## 2026-07-18: feature-specs renumbered

- Removed by direct instruction: `19-deployment-and-infra.md`,
  `20-demo-and-submission copy.md`, and `21-manual-verification copy.md` —
  all three were still `Status: not started`, described hackathon-submission
  logistics (deployment steps, demo video/deck, a manual test checklist) no
  longer needed, and the manual-verification file even had a stray "copy" in
  its filename from an earlier mishap. No code depended on any of the three.
- Renumbered `22-Interview-panel-redesign.md` → `19-Interview-panel-redesign.md`
  to close the resulting gap, so `feature-specs/` is a contiguous `01`–`19`
  sequence again with no numbering skip.
- The unfiled `23-fix-and-delete-prep.md` label (a direct-instruction bundle
  of fixes with no standalone spec doc — see its own entry above) is now
  referred to as `20-fix-and-delete-prep.md` for the same reason, though no
  file by that name exists or ever did.
- Updated every cross-reference to the old numbers: `code-standards.md` and
  `ui-context.md`'s mentions of `22-Interview-panel-redesign.md`; feature-specs
  `06`, `07`, and `08`'s "Verify" sections, which pointed at
  `19-manual-verification.md`'s test-matrix items — reworded inline since that
  checklist no longer exists as a file; and this file's own historical
  entries and Current Phase/Goal/Next Up sections, updated in place rather
  than left dangling since they're operational (living) state, not a pure
  event log.
- `npx tsc --noEmit` and `npm run build` are unaffected — this was a
  docs-and-`context/`-only change, no application code touched. Verified via
  `grep -rn "19-deployment-and-infra\|20-demo-and-submission\|21-manual-verification"
  context/ feature-specs/` returning zero hits.

## Session Notes

- To resume work: read this file first, then the next unimplemented
  feature-spec in numeric order under `feature-specs/`.
- Do not begin any frontend feature-spec before the database and AI-layer
  feature-specs it depends on are marked done here.
