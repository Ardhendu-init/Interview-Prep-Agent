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
1. Use web search grounding to gather: what the company does and its
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

**Search implementation**

- Single call to `openai.responses.create` (via `generateSearchContent` in
  `client.ts`) with `tools: [{ type: "web_search" }]` set, `instructions:
  SYSTEM_PROMPT`, and `input: <user prompt>`. Unlike a manual tool-call loop,
  OpenAI's web search tool is server-executed: the model issues as many
  internal search queries as it needs and returns one final response — there
  is no `tool_calls` round trip to drive by hand
- Uses the Responses API, not Chat Completions, specifically for this file —
  confirmed live against the real API that Chat Completions' `web_search_options`
  is only accepted by dedicated search models (`gpt-4o-search-preview`,
  `gpt-5-search-api`), not `MODEL` itself, while the Responses API's
  `web_search` tool works with `MODEL` directly. `guide-generator.ts` and
  `mock-interviewer.ts` are unaffected and still use Chat Completions via
  `generateContent`/`generateContentLite`
- Treat the call as failed (return the fallback object below, do not attempt to
  parse anything) if `response.output_text` is empty/undefined, or
  `response.status` is not `"completed"` (e.g. `"failed"`, `"incomplete"` with
  no usable text)
- Citation/source annotations are available on the output message's
  `content[].annotations[].url_citation` if needed to cross-check the model's
  own `SOURCES:` line, but the parser below reads `SOURCES:` from
  `response.output_text`, not from the annotations

**Parsing**

- Extract each labeled field with a regex per label (`COMPANY_OVERVIEW:` through
  the next label or end of string)
- Validate the result against `researchFindingsSchema` from `lib/validation.ts`
  before returning — if validation fails, return the fallback object, do not
  return partially-valid data

**Verify**

- See `19-manual-verification.md` test matrix, items 1-3

**Status: done**
