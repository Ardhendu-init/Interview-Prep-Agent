# Interview Prep Agent — Project Overview

## Overview

An agentic web application that takes a company name and job title, autonomously
researches the company via live web search, generates a tailored interview prep
guide, and runs an adaptive live mock interview grounded in that guide. Every prep
session persists to a database, so a user can leave and come back to a past
company's guide, and a demo survives a page refresh. Built for the OpenAI ×
NamasteDev Codex Hackathon; also intended to remain a real tool in ongoing use
after the hackathon ends.

## Goals

1. Demonstrate genuine multi-step agentic behavior — the model drives its own
   research strategy and adapts its own interview questions — not a single
   prompt-to-output call
2. Ship a live, publicly accessible product a judge can use with zero setup, that
   does not lose state on refresh or between visits
3. Keep the persistence layer minimal but real: no user accounts, but every prep
   session is durable and revisitable

## Core User Flow

1. User lands on the home page, sees a list of their past prep sessions (if any,
   identified by an anonymous session cookie) and a "New Prep" action
2. User enters company name + role (+ optional job description)
3. System creates a `InterviewPrep` record, kicks off the research agent
4. Research agent performs model-directed web searches, synthesizes findings,
   findings are persisted
5. Guide generator turns findings into a structured, tailored prep guide,
   persisted
6. User is redirected to `/prep/[id]`, sees the guide, can download it as markdown
7. User starts a mock interview from that same page; each turn (both the agent's
   question and the user's answer) is persisted as it happens
8. User can leave and return later via the home page list; the full guide and
   interview history reload from the database exactly as they left it

## Features

### Company & Role Research (AI)
- Multi-step, model-directed web search (not hardcoded queries)
- Graceful, honest degradation for obscure/private companies — no fabrication

### Prep Guide Generation (AI)
- Structured concepts, each justified against the specific company/role
- Mixed question bank: technical, behavioral, domain
- Markdown export, generated client-side from persisted data

### Mock Interview (AI)
- Multi-turn, guide-grounded chat
- Interviewer agent adapts its next question to the quality of the previous answer
- Full turn history persisted; resumable

### Persistence & Session Management
- Anonymous session identity via an httpOnly cookie — no login, no passwords
- A session can own multiple `InterviewPrep` records (one per company/role
  researched)
- Home page lists a session's past preps, most recent first

## Scope

### In Scope
- The full flow above, end to end
- Postgres-backed persistence (Supabase), no user accounts
- Deployment to a public URL (Vercel)

### Out of Scope
- Authentication / real user accounts (session cookie only — explicitly not
  secure identity, do not treat it as such)
- Resume-to-JD match scoring (a separate existing tool, CareerLens, already does
  this — do not rebuild it here)
- Voice interface
- Real-time streaming of model responses (loading states are simple, not
  token-by-token streams, for v1)
- Sharing a prep guide via a public link to someone outside the owning session
- Rate limiting / abuse prevention beyond basic input length caps (acceptable
  risk for a hackathon demo; documented as a real gap, not silently ignored)

## Success Criteria

1. A user can enter any real company name and receive a non-generic, researched
   prep guide within roughly 30-60 seconds
2. The mock interview's second question visibly differs in approach depending on
   whether the first answer was strong or weak
3. Refreshing the browser mid-flow, or returning a day later via the home page
   list, restores the exact state of a prep session — guide and full interview
   history intact
4. The application deploys with exactly two required environment variables
   (`ANTHROPIC_API_KEY`, `DATABASE_URL`) and no other manual setup
