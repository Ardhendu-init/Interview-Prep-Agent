### AI Client Setup

`lib/ai/client.ts`. Shared Anthropic client — every file in `lib/ai/` imports
from here, none instantiate their own client.

```ts
import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODEL = "claude-sonnet-4-6";
```

**Rules**

- `MODEL` is a named export used everywhere a model string is needed — never
  hardcode the model name string a second time anywhere else in the codebase
- `ANTHROPIC_API_KEY` is read here and only here — no other file references
  `process.env.ANTHROPIC_API_KEY` directly

**Verify**

- Grep the codebase for `process.env.ANTHROPIC_API_KEY` — it should appear
  exactly once, in this file

**Status: not started**
