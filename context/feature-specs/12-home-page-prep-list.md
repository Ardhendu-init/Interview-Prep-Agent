### Home Page — Prep List

`app/page.tsx` (Server Component) + `components/PrepList.tsx`.

**`app/page.tsx`**

- Server Component — reads the session id via `getSessionIdFromCookie()`
  (read-only, no cookie write) and calls `listPrepsForSession(id)` if a
  cookie is present; a brand-new visitor with no cookie yet renders with an
  empty `preps` array instead of calling `getOrCreateSession()` — that
  function's write path calls `setSessionCookie()`, which throws if invoked
  during a Server Component render (verified in `03-session-identity.md`).
  The session row + cookie get created for real on the first Server Action
  call (e.g. the `New Prep` submit via `createPrepAndRunAgent`, which already
  calls `getOrCreateSession()`) — this is option (a) from
  `progress-tracker.md`'s open question on this, now resolved
- Renders `<NewPrepForm />` (see `13-new-prep-form.md`) above `<PrepList preps={preps} />`

**`components/PrepList.tsx`**

- Props: `preps: InterviewPrepRecord[]`
- Empty state (`preps.length === 0`): a short centered message, e.g.
  "No prep sessions yet — start your first one above." — not a blank area
- Non-empty: a vertical stack of cards, each showing company, role, a relative
  created date ("2 hours ago" — use a small formatting helper, not a raw ISO
  string), and a status indicator if not `"ready"` (e.g. "Researching…" in muted
  text) — each card links to `/prep/[id]`
- Sorted newest first (already guaranteed by `listPrepsForSession`'s query order
  — do not re-sort client-side)

**Verify**

- With zero preps, the empty state renders correctly
- With a mix of `"ready"` and `"researching"` status preps, both render with the
  correct visual treatment

**Status: not started**
