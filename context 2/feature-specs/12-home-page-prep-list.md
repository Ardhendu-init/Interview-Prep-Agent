### Home Page — Prep List

`app/page.tsx` (Server Component) + `components/PrepList.tsx`.

**`app/page.tsx`**

- Server Component — calls `getOrCreateSession()` then `listPrepsForSession(id)`
  directly (no Server Action needed for a read-only initial load on a Server
  Component; Server Actions are for client-triggered mutations, not this)
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
