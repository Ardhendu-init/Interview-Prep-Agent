### Database Schema

`prisma/schema.prisma`. This is the first thing implemented — every later
feature-spec assumes this schema exists and is migrated.

**Datasource & generator**

- `provider = "postgresql"`, `url = env("DATABASE_URL")`, plus
  `directUrl = env("DIRECT_URL")` (Supabase requires the direct, non-pooled URL
  for migrations — pooled `DATABASE_URL` for the app at runtime,
  `DIRECT_URL` for `prisma migrate`)

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

- `npx prisma migrate dev --name init` runs clean against a real Supabase
  `DATABASE_URL`
- `npx prisma studio` shows all three tables with the fields above

**Status: not started**
