import OpenAI from "openai";
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
} from "openai/resources/chat/completions";
import type { Response, ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// gpt-5.4: full-strength model. Used for research-agent.ts and
// guide-generator.ts, which each make a single call per prep — output
// quality there directly determines whether the prep guide is any good, so
// this is not the place to cut corners on model tier.
export const MODEL = "gpt-5.4";

// gpt-5.4-mini: cheaper/faster tier in the same family. Used as a
// same-request fallback for MODEL (see generateContent below), and as the
// primary model for the mock interviewer (see generateContentLite below).
export const LITE_MODEL = "gpt-5.4-mini";

// Checks `.status` rather than `instanceof OpenAI.RateLimitError` — Next.js's
// bundler can load the SDK as more than one module instance, which makes the
// SDK's own error classes fail `instanceof` checks against errors it threw
// itself.
function isQuotaExceeded(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: unknown }).status === 429
  );
}

// Thin wrapper around openai.chat.completions.create that retries once
// against LITE_MODEL when MODEL hits a rate limit/quota error (HTTP 429).
// Any other error is rethrown immediately so callers' existing
// catch/fallback handling behaves exactly as before.
export async function generateContent(
  params: Omit<ChatCompletionCreateParamsNonStreaming, "model">,
): Promise<ChatCompletion> {
  try {
    return await openai.chat.completions.create({ ...params, model: MODEL });
  } catch (error) {
    if (!isQuotaExceeded(error)) {
      throw error;
    }
    console.error(
      `[ai-client] ${MODEL} rate limit/quota exceeded, retrying with ${LITE_MODEL}`,
    );
    return await openai.chat.completions.create({ ...params, model: LITE_MODEL });
  }
}

// Calls LITE_MODEL directly, with no MODEL attempt first. Used by the mock
// interviewer, which makes one call per interview turn — a single session
// makes many calls in a row, so interview turns go straight to the cheaper
// tier instead of competing with research/guide generation for MODEL spend.
export async function generateContentLite(
  params: Omit<ChatCompletionCreateParamsNonStreaming, "model">,
): Promise<ChatCompletion> {
  return openai.chat.completions.create({ ...params, model: LITE_MODEL });
}

// Same shape/fallback behavior as generateContent, but calls
// openai.responses.create instead of openai.chat.completions.create.
// Chat Completions' web_search_options is only accepted by dedicated search
// models (gpt-4o-search-preview, gpt-5-search-api, etc) — MODEL itself only
// gets real web search grounding through the Responses API's `web_search`
// tool, confirmed by hitting the real API. research-agent.ts is the only
// caller, since it's the only file needing search grounding.
export async function generateSearchContent(
  params: Omit<ResponseCreateParamsNonStreaming, "model">,
): Promise<Response> {
  try {
    return await openai.responses.create({ ...params, model: MODEL });
  } catch (error) {
    if (!isQuotaExceeded(error)) {
      throw error;
    }
    console.error(
      `[ai-client] ${MODEL} rate limit/quota exceeded, retrying with ${LITE_MODEL}`,
    );
    return await openai.responses.create({ ...params, model: LITE_MODEL });
  }
}
