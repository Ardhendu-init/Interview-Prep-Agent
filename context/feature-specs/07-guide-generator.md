### Guide Generator

`lib/ai/guide-generator.ts`. Second agentic step — turns research findings into a
structured, tailored study guide. Single model call, not a loop.

**Function signature**

```ts
export async function generateGuide(
  input: ResearchInput,
  research: ResearchFindings
): Promise<PrepGuide>
```

Never throws. On any failure (API error, JSON parse failure, schema validation
failure), returns
`{ summary: "The guide could not be generated. Please try again.", concepts: [], questions: [] }`
— a value that satisfies `prepGuideSchema` and that the UI can render as an empty
state rather than crash on.

**System prompt — required content**

Must instruct the model to:
1. Output strict JSON only — no markdown fences, no preamble, no trailing text,
   matching the `PrepGuide` shape from `lib/types.ts` exactly
2. Produce 5-8 concepts, each with 1-3 real, well-known resources (official docs,
   MDN, established educational sites) — explicitly forbid inventing URLs it
   isn't confident are real
3. Write each `whyItMatters` tied to the *specific* company/role context from the
   research findings, not generic advice — this is the single most important
   quality bar for this file; if guides read as generic templates during
   manual testing, tighten this instruction first
4. Produce 6-10 questions mixing `technical`, `behavioral`, and `domain`
   categories, grounded in what the research found (e.g. research mentioning a
   real-time trading product should produce a domain question about real-time
   data handling, not a generic question)

**Call configuration**

- Set `response_format: { type: "json_object" }` on the `generateContent`
  call — this makes the model emit raw JSON without markdown fences in the
  common case, but is not a substitute for the defensive parsing below

**Parsing**

- Strip accidental code fences defensively (`replace(/```json|```/g, "")`)
- `JSON.parse` inside a try/catch
- Validate the parsed object against `prepGuideSchema` — on any parse or
  validation failure, return the fallback object described above

**Verify**

- Confirm `whyItMatters` text differs meaningfully between two different
  companies for the same role

**Status: done** — see `progress-tracker.md` for verification detail and the
one open item (second-company comparison blocked by daily API quota).
