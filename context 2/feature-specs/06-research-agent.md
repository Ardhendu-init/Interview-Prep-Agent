### Research Agent

`lib/ai/research-agent.ts`. First agentic step — the model drives its own search
strategy, not a hardcoded pipeline. This file does not touch the database; it is
called by a Server Action which handles persistence (see
`09-server-actions-preps.md`).

**Function signature**

```ts
export async function runResearch(input: ResearchInput): Promise<ResearchFindings>
```

Never throws. On any failure (API error, exhausted turn budget with no usable
text, parse failure), returns a `ResearchFindings` object with
`companyOverview: "Research could not be completed for this company. You may want to research manually."`
and empty/default values for the other fields — the caller always gets a valid,
typed object.

**System prompt — required content, not exact wording**

Must instruct the model to:
1. Use the `web_search_20250305` tool to gather: what the company does and its
   size/stage, signals about their interview process (search review sites,
   forums, blog posts by past candidates), culture/comp signals if available
2. Decide its own search queries based on what it learns — search again if
   initial results are thin or a specific promising lead is worth following
3. If the company is small/obscure and results are thin, say so plainly rather
   than fabricate — this is the single most important behavioral rule in this
   file; if testing in `19-manual-verification.md` shows any fabrication for an
   obscure company, fix this prompt first before touching any other code
4. Respond, once done searching, in exactly this fixed-label plain-text format
   (not JSON — free-flowing prose reads better in these fields than forced JSON):
   ```
   COMPANY_OVERVIEW: <2-4 sentences>
   INTERVIEW_PROCESS: <2-4 sentences, or "Limited public data available" if thin>
   CULTURE_SIGNALS: <2-3 sentences>
   SOURCES: <comma-separated URLs actually used>
   ```

**Loop implementation**

- Bounded loop, `MAX_TURNS = 6` — call `anthropic.messages.create` with the
  `web_search_20250305` tool available, append each response to message history,
  continue while the model issues `tool_use` blocks, stop when it returns final
  text with `stop_reason !== "tool_use"`
- If `MAX_TURNS` is exhausted without a clean final-text response, treat it as a
  failure and return the fallback object described above — do not attempt to
  parse a partial/mid-search response as if it were final

**Parsing**

- Extract each labeled field with a regex per label (`COMPANY_OVERVIEW:` through
  the next label or end of string)
- Validate the result against `researchFindingsSchema` from `lib/validation.ts`
  before returning — if validation fails, return the fallback object, do not
  return partially-valid data

**Verify**

- See `19-manual-verification.md` test matrix, items 1-3

**Status: not started**
