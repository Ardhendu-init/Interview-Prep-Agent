### Database Client & Migrations

`lib/db/client.ts`. Sets up the Prisma client singleton — every function in
`lib/db/*.ts` imports from this file, never instantiates its own `PrismaClient`.

**`lib/db/client.ts`**

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

This is the standard Next.js dev-mode pattern — without it, hot reload creates a
new `PrismaClient` (and a new connection pool) on every file save, and Supabase's
connection limit gets exhausted within minutes of local development.

**Environment variables**

- `DATABASE_URL` — Supabase pooled connection string (used at runtime by the app)
- `DIRECT_URL` — Supabase direct connection string (used only by
  `prisma migrate` — do not use this for app runtime queries)
- Both added to `.env.local` (gitignored) and to Vercel project settings later
  (see `18-deployment-and-infra.md`)

**Migration workflow (document this, don't skip it)**

- Local schema change → `npx prisma migrate dev --name <description>` → commit
  the generated `prisma/migrations/*` folder
- Never use `prisma db push` beyond a throwaway local experiment — it does not
  produce a migration file, so it cannot be reproduced in deployment
- Production migration application happens automatically in the Vercel build
  step (see `18-deployment-and-infra.md` for the exact build command)

**Verify**

- Editing a file twice in dev mode (triggering two hot reloads) does not increase
  the number of open connections shown in the Supabase dashboard

**Status: done**
