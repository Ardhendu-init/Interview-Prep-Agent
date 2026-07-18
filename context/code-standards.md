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
  provider from the UI — no client-side `fetch` to a `/api/*` route for
  mutations or AI-provider calls in this app
  - **Narrow, discovered exception:** a read-only Route Handler is permitted
    for client-side polling of already-computed status
    (`app/api/prep/[id]/route.ts`, `GET`, used by `PrepGuideView`). Found via
    live testing in `14-prep-page-and-guide-view.md`: Next.js's client
    runtime dispatches every `"use server"` call from a page through one
    sequential action queue, so a Server-Action-based poll queues behind a
    long-running in-flight action (`runResearchAndGuide`, 20-40s) and never
    actually reaches the server until that action resolves — the live
    "Researching…" → "Writing your prep guide…" progression never renders,
    it just jumps straight to "ready" once the queue drains. A plain
    `fetch()` to a Route Handler bypasses that queue entirely. This doesn't
    weaken the rule above — the handler performs no mutation and calls no AI
    provider, so it stays within the rule's actual intent (scoped to
    mutating/AI-calling operations, matching `progress-tracker.md`'s
    already-recorded architecture decision on this).
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
- Since `18-uiux-enhancement.md`: use the semantic color tokens (`bg-surface`,
  `text-fg`, `border-border`, etc., see `ui-context.md`'s Colors table), never
  raw Tailwind palette classes (`bg-neutral-900`, `text-blue-400`) — raw
  palette classes don't repaint when the active theme changes
- Prefer the shared primitives in `components/ui/` (`Button`, `Card`, `Input`/
  `Textarea`, `Skeleton`, `EmptyState`, `Toast`) over hand-rolled markup for
  anything they already cover

## File Organization

```
app/
  page.tsx              — home page (list of past preps)
  prep/[id]/page.tsx     — single prep view
  api/prep/[id]/route.ts   — read-only status poll (GET), see the Next.js
                              section's Server Actions exception above
  actions.ts               — all Server Actions
  layout.tsx                 — root layout
lib/
  ai/
    client.ts                  — shared OpenAI client + model constant
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
  format.ts                                        — display-formatting helpers (e.g. relative dates)
  theme.ts                                          — theme list/type, localStorage key, no-flash init script (see ui-context.md)
  panel-state.ts                                     — interview panel UI-state localStorage helpers (open/width), see 22-Interview-panel-redesign.md
components/
  ui/
    Button.tsx                                          — button variants (primary/secondary/outline/ghost/danger)
    Card.tsx                                              — card surface, optional hover elevation
    Field.tsx                                              — Input/Textarea/Label with shared focus-ring styling
    Skeleton.tsx                                            — pulsing loading placeholder
    EmptyState.tsx                                           — icon + title + description + action
    Toast.tsx                                                 — ToastProvider + useToast()
  Navbar.tsx                                              — sticky header: logo, theme switcher, session badge
  ThemeSwitcher.tsx                                         — theme dropdown, writes data-theme + localStorage
  PageTransition.tsx                                         — page-level fade-in wrapper (mounted in layout.tsx)
  PrepBreadcrumb.tsx                                         — back link + Home → Company breadcrumb on /prep/[id]
  PrepList.tsx                                      — home page list
  NewPrepForm.tsx                                      — company/role input form
  PrepGuideView.tsx                                      — guide display + export + interview panel orchestration (open/focus/mobile-tab state)
  InterviewHeroCTA.tsx                                     — top-of-page entry point that opens the interview panel
  InterviewPanel.tsx                                        — resizable side panel / focus mode / mobile full-view host for MockInterviewChat
  MockInterviewChat.tsx                                    — chat UI
prisma/
  schema.prisma                                              — database schema
  migrations/                                                  — committed migration history
context/                                                         — specs (this folder tree), never imported by app code
```
