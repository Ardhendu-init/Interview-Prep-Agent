# Interview Prep Agent

An agentic web app that takes just a **company name + role**, researches the
company live on the web, generates a tailored interview prep guide, and then
runs an **adaptive mock interview** grounded in that guide — one that actually
changes its next question based on how well you answered the last one.

Built for the **OpenAI × NamasteDev Codex Hackathon** (Akshay Saini).

> Try it: pick a company you're actually interviewing at, give it the role,
> and see if the guide holds up. If the company is obscure or private, it
> will say so honestly instead of making things up.

---

## Why this project

Most "AI interview prep" demos are a single prompt → single output. This one
isn't:

- **Genuinely agentic research** — the model decides its own search queries
  against live web search (OpenAI's Responses API `web_search` tool), reads
  the results, and decides whether to search again before answering. It's not
  a hardcoded `["glassdoor", "levels.fyi"]` query list.
- **Anti-hallucination by design** — the research prompt explicitly forces an
  exact-name match check and requires the model to say *"no company matching
  this name could be found"* rather than quietly substituting a similarly
  named company or inventing detail. Honest degradation beats confident
  fabrication.
- **Adaptive, not scripted, interviewing** — the mock interviewer is a
  multi-turn agent that reads the *quality* of your previous answer and
  steers its next question accordingly (follow-up vs. new topic, harder vs.
  easier), grounded in the guide it generated for you.
- **Real persistence, zero login friction** — no accounts, no passwords.
  An anonymous signed cookie scopes a `Session`, every prep and every
  interview turn is written to Postgres as it happens, so a page refresh or
  a return visit tomorrow restores you to exactly where you left off.
- **Resilient by construction** — every AI-calling function degrades to a
  typed fallback instead of throwing (a bad model response never crashes the
  UI), and a model-tier fallback (`gpt-5.4` → `gpt-5.4-mini`) kicks in on
  rate limits so a demo doesn't die mid-flow.
- **Ships as one deployable unit** — Next.js App Router serves both the UI
  and the backend (Server Actions), deployed to Vercel with exactly two
  required env vars.

---

## How it works

```
1. User enters company + role (+ optional JD)
         │
         ▼
2. Server Action creates an InterviewPrep row (status: "researching")
         │
         ▼
3. Research agent (lib/ai/research-agent.ts)
   → model-directed web search, re-searches if results are thin
   → persists ResearchFindings as JSON
         │
         ▼
4. Guide generator (lib/ai/guide-generator.ts)
   → turns findings into structured concepts + a mixed question bank
   → persists PrepGuide as JSON, status: "ready"
         │
         ▼
5. User lands on /prep/[id] — sees the guide, can export it as Markdown
         │
         ▼
6. Mock interview (lib/ai/mock-interviewer.ts)
   → opens as a resizable side panel (InterviewPanel), grounded in the guide
   → each turn (question + answer) is persisted immediately as InterviewTurn
   → the interviewer's next question adapts to the previous answer's quality
         │
         ▼
7. Leave anytime — come back via the home page's session-scoped prep list,
   guide + full interview history reload exactly as left
```

A lightweight `claimedAt` gate on `InterviewPrep` prevents a page
remount/retry from accidentally kicking off a second research run for the
same row — the kind of race condition that's easy to hit in a real
App-Router app and easy to miss in a demo.

---

## Tech stack

| Layer            | Technology                          | Why                                                                 |
| ----------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| Framework          | **Next.js 16** (App Router) + TypeScript | One deployable unit — UI and backend (Server Actions) together        |
| AI provider           | **OpenAI API** (`openai` SDK)             | Responses API `web_search` tool for grounded research; Chat Completions for guide gen + interviewer |
| Models                   | `gpt-5.4` (research, guide gen) / `gpt-5.4-mini` (mock interviewer, rate-limit fallback) | Full-strength model where output quality matters most; cheaper tier for high-volume per-turn calls |
| ORM                          | **Prisma 7**                                  | Type-safe DB access + migrations, driver adapter (`@prisma/adapter-pg`) |
| Database                        | **PostgreSQL** via **Supabase**                  | Durable persistence — sessions, guides, interview turns                |
| Validation                          | **Zod**                                             | Every system boundary (Server Action input, AI response parsing) validated at runtime |
| Styling                                | **Tailwind CSS v4**, utility classes only              | No component library; semantic CSS-variable tokens for 4 switchable themes |
| Animation                                 | **Framer Motion**                                        | Page transitions, chat bubbles, panel/toast motion               |
| Icons                                        | **lucide-react**                                            | Single consistent icon set                                        |
| Deployment                                      | **Vercel**                                                     | Connects to Supabase via `DATABASE_URL`                             |
| Identity                                           | Signed httpOnly cookie (no auth library)                          | Anonymous session scoping — explicitly not real authentication      |

---

## Data model

Three tables, `prisma/schema.prisma` is the single source of truth:

```
Session (1) ───< InterviewPrep (many) ───< InterviewTurn (many)
```

**`Session`** — anonymous identity, created on first visit
| Field       | Type       | Notes                          |
| ----------- | ---------- | ------------------------------- |
| `id`        | `String`   | cuid, primary key                |
| `createdAt` | `DateTime` |                                    |

**`InterviewPrep`** — one row per company/role a session has researched
| Field              | Type       | Notes                                                      |
| ------------------ | ---------- | ------------------------------------------------------------ |
| `id`                | `String`   | cuid, primary key                                            |
| `sessionId`         | `String`   | FK → `Session`, cascade delete                                 |
| `company` / `role`     | `String`   | user input                                                       |
| `jobDescription`         | `String?`  | optional user input                                                 |
| `researchFindings`          | `Json?`    | `ResearchFindings` shape — null until research completes             |
| `guide`                        | `Json?`    | `PrepGuide` shape — null until guide generation completes              |
| `status`                          | `String`   | `researching` \| `generating_guide` \| `ready` \| `failed`                |
| `claimedAt`                          | `DateTime?`| non-null while a run owns this row — race-condition guard                  |
| `createdAt` / `updatedAt`               | `DateTime` |                                                                                |

**`InterviewTurn`** — one row per chat turn in a mock interview
| Field       | Type       | Notes                                    |
| ----------- | ---------- | ------------------------------------------ |
| `id`        | `String`   | cuid, primary key                            |
| `prepId`    | `String`   | FK → `InterviewPrep`, cascade delete             |
| `role`      | `String`   | `interviewer` \| `candidate`                        |
| `content`   | `String`   | turn text                                              |
| `createdAt` | `DateTime` | ordering key for replay                                   |

No blob/file storage — the Markdown export is generated client-side from
already-fetched JSON, never written to disk or a bucket.

---

## Getting started

**Requirements:** Node.js, an OpenAI API key, a Supabase (or any) Postgres instance.

```bash
npm install
cp .env.example .env   # fill in the three values below
npx prisma migrate deploy   # or `prisma migrate dev` for local schema changes
npm run dev
```

`.env`:

```bash
# Supabase Postgres — pooled connection, used by the app at runtime
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true"

# Supabase Postgres — direct (non-pooled) connection, used only by Prisma migrations
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"

# OpenAI API key for research agent / guide generator / mock interviewer
OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
```

Open [http://localhost:3000](http://localhost:3000), enter a company + role,
and follow the flow described above.

---

## Project structure

```
app/               routes, page composition, Server Actions (the only
                   bridge between UI and lib/) — no direct Prisma/OpenAI calls
lib/ai/            all model-calling logic: research agent, guide generator,
                   mock interviewer, shared OpenAI client
lib/db/            all Prisma access, wrapped in named functions — the only
                   place PrismaClient is touched
lib/session.ts     anonymous session cookie read/write/create
lib/types.ts       shared TS interfaces, mirrored by Zod schemas in
lib/validation.ts  runtime validation at every system boundary
components/        presentational + client-interactive UI, always calling
                   into lib/ via a Server Action, never directly
prisma/            schema.prisma + committed migrations
context/           spec-driven development docs — product spec, architecture,
                   UI conventions, code standards, and numbered feature-specs
                   (01 → 19) implemented sequentially with the progress
                   tracker kept in sync after every step
```

---

## Key decisions worth knowing about

- **Session ≠ auth, on purpose.** Clearing your cookie loses access to your
  past preps permanently — there's no recovery flow. This is a deliberate
  hackathon-appropriate tradeoff (documented as a real, not silent, gap), not
  an oversight.
- **`lib/ai/` never touches the database and `lib/db/` never calls OpenAI.**
  Business logic is pure at the boundary — AI functions take data in, return
  data out; DB functions are always scoped by session id, even internally,
  so there's no code path (including debug code) that can read another
  session's data.
- **AI failures degrade, DB failures don't.** Every `lib/ai/` function
  returns a typed fallback rather than throwing, so a bad or empty model
  response never crashes the UI. Database errors are real failures and are
  surfaced, not swallowed.
- **Spec-driven build process.** The whole app was built against 19
  sequential, numbered feature-specs in `context/feature-specs/`, each
  implemented end-to-end and manually verified (not just "it compiles")
  before moving to the next — the intent was a demo that's actually robust
  under judge use, not just a happy-path recording.

## Scope / explicitly out

Real auth, resume-to-JD match scoring (a separate tool already does this:(https://career-lens-tan.vercel.app/)),
voice-only interfaces beyond the optional Web Speech API mic/TTS toggle,
token-by-token response streaming, cross-session guide sharing, and
production-grade rate limiting are all explicitly out of scope for this
build — see `context/project-overview.md` for the full reasoning.
