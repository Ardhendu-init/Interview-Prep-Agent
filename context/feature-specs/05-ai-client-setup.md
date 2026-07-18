### AI Client Setup

`lib/ai/client.ts`. Shared Gemini client — every file in `lib/ai/` imports
from here, none instantiate their own client.

```ts
import { GoogleGenAI } from "@google/genai";

export const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const MODEL = "gemini-flash-latest";
export const LITE_MODEL = "gemini-flash-lite-latest";
```

Use the `-latest` aliases, not a pinned dated version like `gemini-2.5-flash`.
Google cuts pinned versions off from new AI Studio accounts once a newer
generation ships (HTTP 404 "no longer available to new users"), even though
`models.list` keeps listing them as if still callable — the `-latest` aliases
always resolve to the current recommended model per tier instead of rotting.

Two call helpers are exported:

- `generateContent(params)` — calls `MODEL`; on a 429 (daily quota exceeded)
  retries once against `LITE_MODEL`. Used by `research-agent.ts` and
  `guide-generator.ts`, which each make one call per prep.
- `generateContentLite(params)` — calls `LITE_MODEL` directly, no `MODEL`
  attempt first. Used by `mock-interviewer.ts`, which makes one call per
  interview turn — a single multi-turn session would exhaust `MODEL`'s
  low daily free-tier cap on its own, so interview turns don't compete with
  research/guide generation for that quota.

**Rules**

- `MODEL` and `LITE_MODEL` are named exports used everywhere a model string
  is needed — never hardcode either model name string a second time anywhere
  else in the codebase
- `GEMINI_API_KEY` is read here and only here — no other file references
  `process.env.GEMINI_API_KEY` directly

**Verify**

- Grep the codebase for `process.env.GEMINI_API_KEY` — it should appear
  exactly once, in this file

**Status: done**
