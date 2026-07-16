### Interview Turn Persistence & Server Actions

`lib/db/turns.ts` + the interview-related export of `app/actions.ts`.

**`lib/db/turns.ts`**

```ts
export async function listTurnsForPrep(prepId: string): Promise<InterviewTurn[]>
// Ordered by createdAt ascending (chronological, for chat display).

export async function appendTurn(
  prepId: string,
  role: "interviewer" | "candidate",
  content: string
): Promise<InterviewTurn>
// Inserts and returns the created row.
```

**`app/actions.ts` — `submitInterviewAnswer`**

```ts
export async function submitInterviewAnswer(
  prepId: string,
  candidateAnswer: string | null // null when starting the interview with no prior answer
): Promise<{ turn: InterviewTurn } | { error: string }>
```

Steps, in order:
1. `getOrCreateSession()`, then `getPrepById(sessionId, prepId)` — if null or
   `status !== "ready"`, return `{ error: "This prep isn't ready yet." }`
2. If `candidateAnswer` is not null: validate it's non-empty, then
   `appendTurn(prepId, "candidate", candidateAnswer)`
3. `listTurnsForPrep(prepId)` to get the full history (including the just-added
   candidate turn, if any)
4. `interviewTurn(input, guide, history)` from `lib/ai/mock-interviewer.ts`
5. `appendTurn(prepId, "interviewer", reply)`
6. Return `{ turn: <the newly created interviewer turn> }`

**Why re-fetch history from the database instead of trusting client-passed
history**: the client could be stale or, in a multi-tab scenario, out of sync.
Always reconstructing from the database in step 3 guarantees the model sees the
true persisted state, not whatever the client last rendered.

**Verify**

- Opening the same `/prep/[id]` in two browser tabs and answering in one, then
  refreshing the other, shows the same turn history in both — proves persistence
  is the source of truth, not client state

**Status: not started**
