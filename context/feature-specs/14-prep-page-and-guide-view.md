### Prep Page & Guide View

`app/prep/[id]/page.tsx` (Server Component, initial load) +
`components/PrepGuideView.tsx` (Client Component, rendering + polling).

**`app/prep/[id]/page.tsx`**

- Server Component — `getOrCreateSession()`, then `getPrepById(sessionId, id)`
- If `null` (not found or not this session's): render a simple "Prep not found"
  message with a link back to `/`, not a Next.js default 404 — this is a
  reachable, expected state (e.g. an old/invalid link), handle it explicitly
- Also calls `listTurnsForPrep(id)` (empty array if the prep isn't `"ready"` —
  no interview can exist yet) so the full turn history is available on first
  paint, per `16-mock-interview-chat-ui.md`'s Verify requirement that a
  mid-conversation refresh loads `initialTurns` "from the Server Component,"
  not via a client-side fetch after mount
  - **Resolved ambiguity:** this file originally only mentioned
    `getPrepById`, with no path for `initialTurns` to reach
    `MockInterviewChat` (which `PrepGuideView` renders below the guide).
    Resolved by having this Server Component fetch both and pass both down,
    since `16`'s own text requires the Server-Component-loaded path.
- Passes the initial prep record and turns to
  `<PrepGuideView initialPrep={prep} initialTurns={turns} />`

**`components/PrepGuideView.tsx`**

- If `initialPrep.status !== "ready"`:
  - Call the `runResearchAndGuide(prepId)` Server Action on mount (client
    `useEffect`, once) if `status === "researching"` — this is what actually
    kicks off the AI work; the page existing doesn't automatically trigger it
  - Poll for status every ~2 seconds (`setInterval` + a Server Action or a
    lightweight re-fetch of `getPrepById` equivalent) while status is
    `"researching"` or `"generating_guide"`, updating the displayed message
    ("Researching the company…" → "Writing your prep guide…")
  - If status becomes `"ready"`, stop polling and render the full guide
  - If status becomes `"failed"`, stop polling, show an error state with a
    "Try again" button that re-calls `runResearchAndGuide(prepId)`
- If `status === "ready"` from the start (returning to an already-completed
  prep): render immediately, no polling, no loading state at all

**Guide rendering (once ready)**

1. Research summary card — `companyOverview`, `interviewProcessNotes`,
   `cultureSignals`
2. Concepts grid (`sm:grid-cols-2`) — one card per concept: topic, why it
   matters, resource links
3. Questions list — category pill + question + hint
4. Below all of this: `<MockInterviewChat prepId={...} guide={...} initialTurns={...} />`
   (see `16-mock-interview-chat-ui.md`)

**Verify**

- Creating a new prep and staying on the page shows the researching → generating
  → ready progression live, without a manual refresh
- Navigating away mid-research and returning later (via the home page list)
  shows the correct current state — ready if it finished, still-in-progress if
  not, failed with a retry option if it errored

**Status: not started**
