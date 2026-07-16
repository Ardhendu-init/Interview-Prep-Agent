### Session Identity

`lib/session.ts` + `lib/db/session.ts`. Anonymous, cookie-based session scoping —
see `architecture.md` Auth and Access Model for what this is and, importantly,
what it explicitly is not (not real authentication).

**`lib/db/session.ts`**

- `getOrCreateSession(): Promise<{ id: string }>` — the only function that reads
  the cookie, creates a `Session` row if none exists for the current cookie value,
  and returns the session id. This is the single entry point every Server
  Component/Action uses to establish "who is asking."

**`lib/session.ts`**

- Cookie name: `interview_prep_session`
- `getSessionIdFromCookie(): string | null` — reads the cookie via Next.js
  `cookies()`, returns `null` if absent
- `setSessionCookie(id: string): void` — sets an httpOnly, `sameSite: "lax"`
  cookie, no `Secure` flag override needed (Next.js/Vercel handles this
  correctly per environment), 1-year expiry

**Behavior**

- `getOrCreateSession()` logic: read cookie → if a session id exists, verify the
  `Session` row still exists in the database (it should, but don't assume) →
  if either the cookie is missing or the row doesn't exist, create a new
  `Session` row and set a new cookie → return the id
- This function is called at the top of every Server Action and in the home page
  Server Component — never assume a session already exists by the time you reach
  business logic

**Verify**

- Clearing browser cookies and reloading the home page creates a fresh, empty
  session (no past preps visible) rather than erroring
- Two different browsers (or incognito windows) never see each other's preps

**Status: not started**
