### Mock Interview Chat UI

`components/MockInterviewChat.tsx`. Client component. Unlike a purely
client-state chat, every turn here is persisted — this component reflects
database state, it does not own the source of truth.

**Props**

```ts
{ prepId: string; guide: PrepGuide; initialTurns: InterviewTurn[] }
```

**States**

- **Not started** (`initialTurns.length === 0`): a "Start Mock Interview" card
  and button
- **In progress**: scrollable turn history (`max-h-96 overflow-y-auto`),
  interviewer turns styled `text-neutral-200`, candidate turns
  `text-blue-300`, each with a small uppercase role label
- **Pending**: "Thinking…" shown beneath the last turn while awaiting a reply

**Behavior**

- `start()` — calls `submitInterviewAnswer(prepId, null)` (see
  `10-server-actions-interview.md` — `null` means "no answer yet, just start"),
  appends the returned interviewer turn to local state
- `send()` — appends the candidate's draft to local state immediately
  (optimistic), clears the input, calls
  `submitInterviewAnswer(prepId, draftText)`, appends the returned interviewer
  turn on success
- On a failed Server Action call: remove the optimistically-added candidate turn
  from local state and show an inline error with a retry option — do not leave
  local state showing a turn that never actually persisted

**Why local state at all, if the database is the source of truth**: to avoid a
network round-trip before the user's own message appears on screen. The
optimistic-then-reconcile pattern above keeps this fast without lying about what
actually got saved — see the failure-path rule.

**Verify**

- Refreshing `/prep/[id]` mid-conversation shows the exact same turn history as
  before the refresh (loaded via `initialTurns` from the Server Component)
- Killing network access mid-`send()` (or another way of forcing the Server
  Action to fail) removes the optimistic candidate turn rather than leaving a
  phantom message that was never saved

**Status: not started**
