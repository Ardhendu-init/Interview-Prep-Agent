# Interview Prep Agent

An agentic web app that researches a company and role, generates a tailored
interview prep guide, and runs an adaptive mock interview grounded in that
guide. See `context/project-overview.md` for the full product spec and
`context/progress-tracker.md` for current implementation status.

## Development

```bash
npm install
npm run dev
```

Requires `ANTHROPIC_API_KEY`, `DATABASE_URL`, and `DIRECT_URL` in `.env`
(Supabase Postgres — pooled URL for `DATABASE_URL`, direct URL for
`DIRECT_URL`, used by Prisma migrations).
