### Database Schema

`prisma/schema.prisma`. This is the first thing implemented — every later
feature-spec assumes this schema exists and is migrated.

**Datasource & generator**

- Installed Prisma version is 7 (`npm install prisma` currently resolves to
  7.x), which removed `url`/`directUrl` from the `datasource` block in
  `schema.prisma` — the CLI now errors (`P1012`) if either is present there.
  Connection config moves to a root-level `prisma.config.ts` instead. Adapted
  as follows, same intent as originally written (pooled URL for the app,
  direct URL for migrations), different mechanism:
  - `schema.prisma`: `datasource db { provider = "postgresql" }` — no `url`
  - `prisma.config.ts`: `defineConfig({ datasource: { url: env("DIRECT_URL") } })`
    — this is what `prisma migrate dev` / `prisma studio` connect with
  - The app's runtime `PrismaClient` (added in
    `02-database-client-and-migrations.md`) will connect via a driver adapter
    (`@prisma/adapter-pg`) using the pooled `DATABASE_URL`, not the schema file
  - See `architecture.md` for the full explanation

**Models — implement exactly this shape**

```prisma
model Session {
  id        String          @id @default(cuid())
  createdAt DateTime        @default(now())
  preps     InterviewPrep[]
}

model InterviewPrep {
  id                String          @id @default(cuid())
  sessionId         String
  session           Session         @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  company           String
  role              String
  jobDescription    String?
  researchFindings  Json?           // ResearchFindings shape, nullable until research completes
  guide             Json?           // PrepGuide shape, nullable until generation completes
  status            String          @default("researching")
  // one of: "researching" | "generating_guide" | "ready" | "failed"
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  turns             InterviewTurn[]

  @@index([sessionId])
}

model InterviewTurn {
  id              String        @id @default(cuid())
  prepId          String
  prep            InterviewPrep @relation(fields: [prepId], references: [id], onDelete: Cascade)
  role            String        // "interviewer" | "candidate"
  content         String
  createdAt       DateTime      @default(now())

  @@index([prepId, createdAt])
}
```

**Why `status` exists on `InterviewPrep`**: research and guide generation are two
sequential model calls that together can take 30-60 seconds. The UI needs to show
progress ("researching…" vs "writing your guide…") and recover cleanly if the
process fails partway — `status` is how the frontend knows what to render, and
`"failed"` is how it knows to show a retry action instead of a blank state.

**Why `researchFindings` and `guide` are nullable `Json`, not required**: a row
is created immediately when the user submits the form (so a prep id exists to
navigate to right away), then filled in as the agent steps complete. Do not model
this as "create the row only once everything is ready" — the UI needs the id
before the AI work finishes.

**Verify**

- `npx prisma validate` and `npx prisma generate` pass — confirmed
- `npx prisma migrate dev --name init` ran clean against the real Supabase
  `DIRECT_URL` (project `tjlvomfcrfkjykuxwgjr`), generating
  `prisma/migrations/20260716165320_init/migration.sql` — committed
- Note: the Supabase-generated password contained `#` and `$`. `#` is a URL
  fragment delimiter, so the raw password silently truncated the connection
  string. Fixed by percent-encoding the password in `.env`
  (`#` → `%23`, `$` → `%24`) — anyone rotating this password needs to
  re-encode it the same way, not paste it raw from the Supabase dashboard
- `npx prisma studio` not run (no need — the migration output confirms the
  three tables were created with the fields above)

**Status: done**
