### Prep Persistence & Server Actions

`lib/db/preps.ts` (query functions) + the prep-related exports of `app/actions.ts`
(Server Actions). This is where the research agent and guide generator get wired
to the database and the UI.

**`lib/db/preps.ts` — query functions**

```ts
export async function createPrep(sessionId: string, input: ResearchInput): Promise<{ id: string }>
// Inserts a row with status "researching", researchFindings and guide null.
// Returns immediately after insert — do not wait for AI work here.

export async function getPrepById(sessionId: string, prepId: string): Promise<InterviewPrepRecord | null>
// Returns null if the prep doesn't exist OR belongs to a different session —
// callers must not be able to distinguish "not found" from "not yours" (don't
// leak existence of other sessions' data via a different error message).

export async function listPrepsForSession(sessionId: string): Promise<InterviewPrepRecord[]>
// Ordered by createdAt descending. Used by the home page.

export async function updatePrepResearch(prepId: string, findings: ResearchFindings): Promise<void>
// Sets researchFindings, status -> "generating_guide"

export async function updatePrepGuide(prepId: string, guide: PrepGuide): Promise<void>
// Sets guide, status -> "ready"

export async function markPrepFailed(prepId: string): Promise<void>
// Sets status -> "failed". Called if either AI step throws unexpectedly (should
// be rare given research-agent.ts and guide-generator.ts are designed not to
// throw, but the Server Action still wraps the whole flow in try/catch as a
// last line of defense).
```

**`app/actions.ts` — `createPrepAndRunAgent`**

```ts
export async function createPrepAndRunAgent(rawInput: unknown): Promise<{ prepId: string } | { error: string }>
```

Steps, in order:
1. `getOrCreateSession()` to establish the session id
2. Validate `rawInput` with `researchInputSchema.safeParse` — on failure, return
   `{ error: "..." }` with a user-facing message, do not proceed
3. `createPrep(sessionId, input)` — get a `prepId` immediately
4. Return `{ prepId }` to the client **before** the AI work completes — the
   client navigates to `/prep/[id]` right away and that page shows the
   "researching…" state while the rest happens
5. The actual research + guide generation happens in a *second* Server Action
   (`runResearchAndGuide(prepId)`), triggered by the `/prep/[id]` page on mount,
   not inside `createPrepAndRunAgent` itself — this keeps the initial action fast
   and lets the UI show progressive status instead of one long blocking call

**`app/actions.ts` — `runResearchAndGuide`**

```ts
export async function runResearchAndGuide(prepId: string): Promise<void>
```

1. `getOrCreateSession()`, then `getPrepById(sessionId, prepId)` — if null,
   return silently (don't throw for a not-found/not-yours case, just no-op)
2. `runResearch(input)` from `lib/ai/research-agent.ts`
3. `updatePrepResearch(prepId, findings)`
4. `generateGuide(input, findings)` from `lib/ai/guide-generator.ts`
5. `updatePrepGuide(prepId, guide)`
6. Wrap steps 2-5 in try/catch; on any unexpected throw, `markPrepFailed(prepId)`

**Why split into two actions**: a single action that blocks on both AI steps
(30-60+ seconds combined) risks a Vercel serverless function timeout and gives
the user no progressive feedback. Splitting means the id exists and the page can
render immediately, then the page itself triggers and awaits the slower work.

**Verify**

- Submitting the form navigates to `/prep/[id]` within ~1 second (before AI work
  completes)
- A session cannot fetch another session's prep by guessing/changing the id in
  the URL — `getPrepById` returns `null` for it

**Status: not started**
