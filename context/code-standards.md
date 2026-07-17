# Code Standards

## General

- Keep modules small and single-purpose — one agent step per file, one concern
  per `lib/db/` function
- Fix root causes; do not layer try/catch around symptoms without understanding
  why a call failed
- Do not mix unrelated concerns in one component, route, or function
- No unused exports, no dead code left "just in case" — if something is cut from
  scope, delete it and note the cut in `progress-tracker.md`, don't leave it
  commented out

## TypeScript

- Strict mode required throughout (`tsconfig.json` — do not weaken it)
- No `any`. If a shape is genuinely unknown (e.g. raw model output before
  parsing), type it `unknown` and narrow it explicitly — never `any` as an escape
  hatch
- All shared types live in `lib/types.ts`. Do not define ad-hoc inline shapes in
  components or Server Actions that duplicate or drift from these
- Prefer `interface` over `type` for object shapes (consistency, not a hard
  technical requirement)

## Validation (critical — this is where "less debugging" comes from)

- Every external input — form submission, Server Action argument, model JSON
  output — is validated with a Zod schema from `lib/validation.ts` before use
- Zod schemas mirror the interfaces in `lib/types.ts` field-for-field; if you
  change one, change the other in the same step
- Parse, don't assume: `schema.safeParse(input)`, handle the `.success === false`
  branch explicitly with a typed error return — never a bare `throw` that a
  Server Action forgot to catch
- Model JSON output (guide generation) is validated the same way as user input —
  the model is an untrusted external input source, not a trusted internal one

## Next.js

- Server Components by default. Add `"use client"` only where browser
  interactivity is required (forms, chat scroll position, button handlers)
- Server Actions are the only sanctioned way to mutate data or call the AI
  provider from the UI — no client-side `fetch` to a `/api/*` route for this app
- Keep Server Actions thin (see architecture.md invariant 2): validate, delegate,
  return. No inline business logic, no inline Prisma queries, no inline prompts
- Route structure:
  - `app/page.tsx` — home page, lists past preps for the current session,
    "New Prep" entry point
  - `app/prep/[id]/page.tsx` — a single prep's guide + mock interview, loads from
    the database by id, scoped to the requesting session
  - `app/actions.ts` — all Server Actions

## Database / Prisma

- All queries live in named functions in `lib/db/`, grouped by entity
  (`lib/db/preps.ts`, `lib/db/turns.ts`, `lib/db/session.ts`) — no inline
  `prisma.x.findMany(...)` calls anywhere outside `lib/db/`
- Every query that takes a prep id also takes and checks a session id — see
  architecture.md invariant 4. There is no "trusted internal caller" exception.
- Migrations are committed to the repo (`prisma/migrations/`) — never rely on
  `prisma db push` for anything beyond initial local scaffolding; use
  `prisma migrate dev` so migration history is real and reproducible in
  deployment
- JSON columns (`researchFindings`, `guide` on `InterviewPrep`) are typed at the
  application boundary via the Zod schemas in `lib/validation.ts`, not trusted
  as their Prisma `Json` type alone

## AI / Model-Calling Code

- Every model call has an explicit `max_tokens` — never omit it
- System prompts are named constants at the top of their file, not inline
  strings buried in a function body
- Every function in `lib/ai/` documents in a comment what it returns on failure
  (per architecture.md invariant 3) — this is not optional, it's how the rest of
  the app is allowed to assume these functions never throw
- Model JSON output is parsed defensively: strip accidental markdown code
  fences, `JSON.parse` inside a try/catch, validate the result against the Zod
  schema, fall back to a safe typed default on any failure at any stage

## Styling

- Tailwind utility classes only — no separate CSS files beyond `globals.css`
- Follow the palette, spacing, and radius scale defined in `ui-context.md` — no
  arbitrary hex values or magic numbers in `className` strings

## File Organization

```
app/
  page.tsx              — home page (list of past preps)
  prep/[id]/page.tsx     — single prep view
  actions.ts               — all Server Actions
  layout.tsx                 — root layout
lib/
  ai/
    client.ts                  — shared Gemini client + model constant
    research-agent.ts            — research step
    guide-generator.ts             — guide generation step
    mock-interviewer.ts              — mock interview step
  db/
    client.ts                          — Prisma client singleton
    preps.ts                             — InterviewPrep queries
    turns.ts                               — InterviewTurn queries
    session.ts                               — Session queries
  session.ts                                   — cookie read/write helpers
  types.ts                                       — shared TS interfaces
  validation.ts                                   — Zod schemas mirroring types.ts
components/
  PrepList.tsx                                      — home page list
  NewPrepForm.tsx                                      — company/role input form
  PrepGuideView.tsx                                      — guide display + export
  MockInterviewChat.tsx                                    — chat UI
prisma/
  schema.prisma                                              — database schema
  migrations/                                                  — committed migration history
context/                                                         — specs (this folder tree), never imported by app code
```
