### Deployment & Infrastructure

Ships the app to a public URL with a real database. Blocked on
`19-manual-verification.md`'s local pass first — do not deploy something that
hasn't been checked end to end locally.

**Supabase setup**

1. Create a new Supabase project
2. From project settings → Database, copy the pooled connection string into
   `DATABASE_URL` and the direct connection string into `DIRECT_URL`
3. Run `npx prisma migrate deploy` once against these to apply the schema (or
   let the Vercel build step do this — see below)

**Vercel setup**

1. Push the repo to a public GitHub repository (hackathon submission rules
   require a public repo)
2. Import into Vercel
3. Add environment variables in Vercel project settings (Production + Preview):
   `GEMINI_API_KEY`, `DATABASE_URL`, `DIRECT_URL`
4. Set the build command to run migrations before building:
   `prisma migrate deploy && next build` (override the default `next build` in
   Vercel's project settings, or add it as the `"build"` script in
   `package.json` — either is fine, pick one and document which in
   `progress-tracker.md`)
5. Deploy

**Post-deploy smoke test**

- Open the live URL in an incognito window
- Run the full flow: home page (empty state) → new prep → watch status progress
  live → guide renders → mock interview → refresh mid-interview → turns persist
- This is the same test as `19-manual-verification.md`, run once more against
  the deployed URL instead of localhost — do not skip re-running it just because
  it passed locally; deployed environment variables or connection behavior can
  differ

**Verify**

- The live URL works for a judge with zero setup — no login, no config, nothing
  to install
- Record the final URL in `progress-tracker.md` and in the hackathon submission
  form

**Status: not started**
