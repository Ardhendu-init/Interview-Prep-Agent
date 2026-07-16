### Shared Types & Validation

`lib/types.ts` + `lib/validation.ts`. Built together, always changed together
(per `ai-workflow-rules.md` Protected Files). Every other module in `lib/`
depends on these two files.

**`lib/types.ts`**

```ts
export interface ResearchInput {
  company: string;
  role: string;
  jobDescription?: string;
}

export interface ResearchFindings {
  companyOverview: string;
  interviewProcessNotes: string;
  cultureSignals: string;
  sourcesUsed: string[];
}

export interface PrepConcept {
  topic: string;
  whyItMatters: string;
  resources: { title: string; url: string }[];
}

export interface PrepQuestion {
  question: string;
  category: "technical" | "behavioral" | "domain";
  hint: string;
}

export interface PrepGuide {
  concepts: PrepConcept[];
  questions: PrepQuestion[];
  summary: string;
}

export type PrepStatus = "researching" | "generating_guide" | "ready" | "failed";

export interface InterviewTurn {
  id: string;
  role: "interviewer" | "candidate";
  content: string;
  createdAt: string; // ISO string once serialized from the database
}
```

**`lib/validation.ts`** — Zod schemas mirroring the above field-for-field

```ts
import { z } from "zod";

export const researchInputSchema = z.object({
  company: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  jobDescription: z.string().max(5000).optional(),
});

export const resourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
});

export const prepConceptSchema = z.object({
  topic: z.string().min(1),
  whyItMatters: z.string().min(1),
  resources: z.array(resourceSchema).min(1).max(3),
});

export const prepQuestionSchema = z.object({
  question: z.string().min(1),
  category: z.enum(["technical", "behavioral", "domain"]),
  hint: z.string().min(1),
});

export const prepGuideSchema = z.object({
  summary: z.string().min(1),
  concepts: z.array(prepConceptSchema).min(1).max(10),
  questions: z.array(prepQuestionSchema).min(1).max(15),
});

export const researchFindingsSchema = z.object({
  companyOverview: z.string(),
  interviewProcessNotes: z.string(),
  cultureSignals: z.string(),
  sourcesUsed: z.array(z.string()),
});
```

**Why this matters for "less debugging"**: `prepGuideSchema` is used in two
places — validating the model's JSON output in `guide-generator.ts` (catches
malformed AI output before it ever reaches the database) and, implicitly, as the
documented shape of the `guide` `Json` column. If the model ever drifts from this
shape, `safeParse` fails loudly in one place instead of causing a confusing
`undefined` deep in a React component three files away.

**Verify**

- `npx tsc --noEmit` passes
- Every interface in `types.ts` has a corresponding schema in `validation.ts` —
  do a manual side-by-side check, this is not something the compiler catches for
  you

**Status: done**
