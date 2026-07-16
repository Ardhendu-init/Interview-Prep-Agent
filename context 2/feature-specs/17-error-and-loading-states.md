### Error & Loading State Conventions

Not a single file — a cross-cutting convention applied to every Server Action
call site built in earlier feature-specs. Implement this as a pass over
`NewPrepForm.tsx`, `PrepGuideView.tsx`, and `MockInterviewChat.tsx` after their
core behavior is working, to make sure all three follow the same pattern.

**Rules**

1. Every Server Action call from a client component is wrapped in
   `startTransition`, and the component tracks `isPending` from
   `useTransition` — buttons that trigger a Server Action are disabled while
   `isPending`
2. Every Server Action that can fail returns a discriminated result
   (`{ data } | { error: string }`), never throws across the Server
   Action boundary into the client — client code checks for `.error` and
   renders it, it does not need a try/catch around the call itself for expected
   failure modes
3. Error messages shown to the user are short, plain-language, and always paired
   with a way forward (a retry button, a "start over" link) — never a dead end
4. Loading states show the shape of what's coming (a card with muted text
   inside it, per `ui-context.md`), not a generic full-page spinner that hides
   the rest of the UI
5. No `console.error`-only failure handling anywhere a user is waiting on the
   result — if it's worth logging, it's worth showing the user something too

**Verify**

- Manually force at least one failure in each of the three flows (invalid API
  key, or a network throttle) and confirm each shows a recoverable, styled error
  state rather than a blank screen, a browser error overlay, or a silently
  stuck loading state

**Status: not started**
