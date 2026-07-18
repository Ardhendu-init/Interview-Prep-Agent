import { GoogleGenAI } from "@google/genai";
import type { GenerateContentParameters, GenerateContentResponse } from "@google/genai";

export const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const MODEL = "gemini-2.5-flash";

// gemini-2.5-flash's free tier is capped at 20 requests/day. gemini-2.5-flash-lite
// is the same model generation with a materially higher free-tier daily cap, so it's
// used as a same-quality fallback rather than a quality downgrade.
const FALLBACK_MODEL = "gemini-2.5-flash-lite";

// Checks `.status` rather than `instanceof ApiError` — Next.js's bundler can
// load the SDK as more than one module instance, which makes the SDK's own
// ApiError class fail `instanceof` checks against errors it threw itself.
function isQuotaExceeded(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: unknown }).status === 429
  );
}

// Thin wrapper around genAI.models.generateContent that retries once against
// FALLBACK_MODEL when MODEL's free-tier daily quota is exhausted (HTTP 429 /
// RESOURCE_EXHAUSTED). Any other error is rethrown immediately so callers'
// existing catch/fallback handling behaves exactly as before.
export async function generateContent(
  params: Omit<GenerateContentParameters, "model">,
): Promise<GenerateContentResponse> {
  try {
    return await genAI.models.generateContent({ ...params, model: MODEL });
  } catch (error) {
    if (!isQuotaExceeded(error)) {
      throw error;
    }
    console.error(
      `[ai-client] ${MODEL} daily quota exceeded, retrying with ${FALLBACK_MODEL}`,
    );
    return await genAI.models.generateContent({ ...params, model: FALLBACK_MODEL });
  }
}
