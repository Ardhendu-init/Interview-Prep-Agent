import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 moved connection config out of schema.prisma into this file.
// Migrations need a direct (non-pooled) connection — Supabase's pooled
// DATABASE_URL doesn't support the DDL Prisma Migrate issues.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
