# AI Workflow Rules

## Approach

Build this project incrementally using a spec-driven workflow. The files in this
`context/` folder define what to build, how to build it, and the current state of
progress. Always implement against `context/feature-specs/*.md`, in numeric
order — do not skip ahead, do not infer or invent behavior not written down here.
If you're about to make a product or architecture decision that isn't captured
anywhere in `context/`, stop and write it down first (in the relevant context
file, or as an open question in `progress-tracker.md`), then proceed.

## Before You Write Any Code

1. Read `project-overview.md`, `architecture.md`, `code-standards.md`,
   `ui-context.md` in full — these apply to every feature-spec, not just one
2. Read `progress-tracker.md` to see what's already done
3. Read the single feature-spec file you're about to implement, in full, before
   writing anything

## Scoping Rules

- Work on exactly one feature-spec file at a time, in numeric order
- Prefer small, verifiable increments over large speculative changes
- Do not combine unrelated system boundaries in one implementation step (e.g. do
  not touch both `lib/ai/research-agent.ts` and `components/MockInterviewChat.tsx`
  in the same step unless one feature-spec explicitly covers both)
- A feature-spec that touches the database schema is always implemented and
  migrated before any feature-spec that reads/writes that data

## When to Split Work

Split an implementation step if it combines:

- Database schema changes and UI changes that don't share one feature-spec
- Multiple unrelated files in `lib/ai/` or `lib/db/`
- Behavior not clearly defined in the current feature-spec file

If a change cannot be verified end to end quickly (a few minutes, manually), the
scope is too broad — implement less, or split the feature-spec into two before
continuing.

## Handling Missing Requirements

- Do not invent product behavior not defined in `context/`
- If a requirement is ambiguous, resolve it by editing the relevant feature-spec
  file before implementing — don't guess silently in code
- If a requirement is missing entirely, add it as an open question in
  `progress-tracker.md`, propose a reasonable default, and proceed with that
  default only if it's clearly low-stakes and reversible; otherwise stop and
  surface it instead of guessing

## Protected Files / Decisions

Do not change the following without explicitly updating the relevant context
file in the same step and noting why in `progress-tracker.md`:

- `architecture.md` invariants
- `prisma/schema.prisma` field names/types already in use by shipped
  feature-specs (adding new fields/models is fine; renaming or retyping existing
  ones that earlier feature-specs depend on is not, without updating this file)
- `lib/types.ts` and `lib/validation.ts` — these two files must always be
  changed together, in the same step, never one without the other

## Keeping Docs in Sync

Update the relevant context file whenever implementation changes:

- New architectural boundary, storage decision, or schema change → `architecture.md`
- New visual pattern or token → `ui-context.md`
- New convention discovered while building → `code-standards.md`
- Any scope change (feature added/cut) → `project-overview.md`
- Always → `progress-tracker.md`, after every meaningful change, no exceptions

## Before Moving to the Next Feature-Spec

1. The current feature-spec's scope works end to end, manually verified — not
   just "compiles" or "type-checks"
2. No invariant in `architecture.md` was violated
3. `progress-tracker.md` reflects the completed work, including anything that
   deviated from the original feature-spec and why
4. `npm run build` passes
5. `npx tsc --noEmit` passes
6. If the step touched the database schema: a Prisma migration was generated and
   committed, not just `db push`-ed locally
7. Don't commit by yourself instead give me commit message , if anytime i need you to commit i will ask explicitly 
