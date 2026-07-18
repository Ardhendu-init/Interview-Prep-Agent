### AI Client Setup

`lib/ai/client.ts`. Shared OpenAI client — every file in `lib/ai/` imports
from here, none instantiate their own client.

```ts
import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const MODEL = "gpt-5.4";
export const LITE_MODEL = "gpt-5.4-mini";
```

Three call helpers are exported:

- `generateContent(params)` — thin wrapper around
  `openai.chat.completions.create`. Calls `MODEL`; on a 429 (rate limit/quota
  exceeded) retries once against `LITE_MODEL`. Used by `guide-generator.ts`,
  which makes one call per prep — output quality there directly determines
  guide quality, so this tier isn't the place to cut corners.
- `generateContentLite(params)` — thin wrapper around
  `openai.chat.completions.create`. Calls `LITE_MODEL` directly, no `MODEL`
  attempt first. Used by `mock-interviewer.ts`, which makes one call per
  interview turn — cost compounds fast across a multi-turn session, so
  interview turns go straight to the cheaper tier instead of competing with
  research/guide generation for `MODEL` spend. `LITE_MODEL` is `gpt-5.4-mini`,
  not the smaller `gpt-5.4-nano` tier — the mock interviewer's adaptive
  follow-up questioning needs real reasoning about answer quality, which nano
  (sized for classification/completion) isn't built for.
- `generateSearchContent(params)` — same shape/fallback behavior as
  `generateContent`, but wraps `openai.responses.create` instead. Used only by
  `research-agent.ts`. Confirmed live against the real API that Chat
  Completions' `web_search_options` is only accepted by dedicated search
  models (`gpt-4o-search-preview`, `gpt-5-search-api`), not `MODEL` itself —
  the Responses API's `web_search` tool is the only way to get real search
  grounding on `MODEL`/`LITE_MODEL` directly. See `06-research-agent.md`.

**Rules**

- `MODEL` and `LITE_MODEL` are named exports used everywhere a model string
  is needed — never hardcode either model name string a second time anywhere
  else in the codebase
- `OPENAI_API_KEY` is read here and only here — no other file references
  `process.env.OPENAI_API_KEY` directly

**Verify**

- Grep the codebase for `process.env.OPENAI_API_KEY` — it should appear
  exactly once, in this file

**Status: done**
