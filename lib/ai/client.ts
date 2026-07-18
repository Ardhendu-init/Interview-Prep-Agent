import { GoogleGenAI } from "@google/genai";
import type { GenerateContentParameters, GenerateContentResponse } from "@google/genai";

export const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Pinned dated versions (e.g. "gemini-2.5-flash") get cut off from new Google
// AI Studio accounts once a newer generation ships (HTTP 404 "no longer
// available to new users"), even while still listed by the models.list API.
// The "-latest" aliases always resolve to Google's current recommended
// model for that tier, so they don't rot the same way.
export const MODEL = "gemini-flash-latest";

// gemini-flash-latest's free tier has a low daily request cap.
// gemini-flash-lite-latest is a lighter, higher-cap tier in the same family,
// so it's used as a same-quality-tier fallback for MODEL, and as the primary
// model for the mock interviewer (see generateContentLite below).
export const LITE_MODEL = "gemini-flash-lite-latest";

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
// LITE_MODEL when MODEL's free-tier daily quota is exhausted (HTTP 429 /
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
      `[ai-client] ${MODEL} daily quota exceeded, retrying with ${LITE_MODEL}`,
    );
    return await genAI.models.generateContent({ ...params, model: LITE_MODEL });
  }
}

// Calls LITE_MODEL directly, with no MODEL attempt first. Used by the mock
// interviewer, which makes one call per interview turn — a single session
// would burn through MODEL's 20/day free-tier cap on its own, so interview
// turns go straight to LITE_MODEL's materially higher cap instead of
// competing with research/guide generation for MODEL's quota.
export async function generateContentLite(
  params: Omit<GenerateContentParameters, "model">,
): Promise<GenerateContentResponse> {
  return genAI.models.generateContent({ ...params, model: LITE_MODEL });
}
