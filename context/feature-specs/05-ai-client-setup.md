### AI Client Setup

`lib/ai/client.ts`. Shared Gemini client — every file in `lib/ai/` imports
from here, none instantiate their own client.

```ts
import { GoogleGenAI } from "@google/genai";

export const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const MODEL = "gemini-2.5-flash";
```

**Rules**

- `MODEL` is a named export used everywhere a model string is needed — never
  hardcode the model name string a second time anywhere else in the codebase
- `GEMINI_API_KEY` is read here and only here — no other file references
  `process.env.GEMINI_API_KEY` directly

**Verify**

- Grep the codebase for `process.env.GEMINI_API_KEY` — it should appear
  exactly once, in this file

**Status: done**
