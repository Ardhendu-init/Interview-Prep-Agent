### Manual Verification

Not code — a checklist to run locally once a real `OPENAI_API_KEY` and a real
Supabase `DATABASE_URL`/`DIRECT_URL` are in `.env.local`. Nothing in
`18-deployment-and-infra.md` should be trusted as ready until every item here
passes.

**Setup**

- `npx prisma migrate dev` applied locally
- `npm run dev`, open `localhost:3000`

**Test matrix**

1. Home page with zero preps shows the correct empty state
2. Well-known company — research is specific and non-generic, guide concepts
   feel tailored, not templated
3. Mid-size/startup company — research still returns something useful
4. Obscure/small/private company — research is honest about thin data rather
   than inventing specifics (per `06-research-agent.md` degradation rule)
5. Guide generation — `whyItMatters` text for the same role differs meaningfully
   between two different companies (per `07-guide-generator.md`)
6. Mock interview — one deliberately shallow answer and one deliberately strong
   answer in the same session; confirm the follow-up question approach visibly
   differs (per `08-mock-interviewer.md`)
7. Markdown download — file opens correctly, headers/links/lists render
   (per `15-markdown-export.md`)
8. **Persistence**: mid-mock-interview, refresh the browser tab — full turn
   history reloads exactly as it was
9. **Persistence across sessions**: create a prep, note its URL, close the
   browser fully, reopen, navigate to the home page — the prep appears in the
   list (same browser = same cookie = same session)
10. **Session isolation**: open the app in a second, separate browser (or a
    true incognito window with cookies never shared) — confirm it shows an
    empty prep list, not the first browser's preps
11. **Error path**: temporarily set an invalid `OPENAI_API_KEY`, create a new
    prep, confirm the UI reaches a `"failed"` status with a working "Try again"
    button rather than hanging indefinitely
12. `npm run build` passes
13. `npx tsc --noEmit` passes

**On completion**

- Update `progress-tracker.md`: mark this done, note any prompt tuning that was
  needed as a result of real-output testing (especially for items 2-6 above)

**Status: not started — blocked on a real API key and a real Supabase database**
