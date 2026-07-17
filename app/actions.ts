"use server";

import { getOrCreateSession } from "../lib/db/session";
import {
  createPrep,
  getPrepById,
  updatePrepResearch,
  updatePrepGuide,
  markPrepFailed,
} from "../lib/db/preps";
import { researchInputSchema } from "../lib/validation";
import { runResearch } from "../lib/ai/research-agent";
import { generateGuide } from "../lib/ai/guide-generator";
import type { ResearchInput } from "../lib/types";

export async function createPrepAndRunAgent(
  rawInput: unknown,
): Promise<{ prepId: string } | { error: string }> {
  const { id: sessionId } = await getOrCreateSession();

  const parsed = researchInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { error: "Please provide a valid company name and role." };
  }

  const { id: prepId } = await createPrep(sessionId, parsed.data);
  return { prepId };
}

// The actual AI work is a second action, triggered by the /prep/[id] page on
// mount, so createPrepAndRunAgent can return fast and the page can render a
// "researching..." state instead of blocking on 30-60+ seconds of AI calls.
export async function runResearchAndGuide(prepId: string): Promise<void> {
  const { id: sessionId } = await getOrCreateSession();

  const prep = await getPrepById(sessionId, prepId);
  if (!prep) {
    return;
  }

  const input: ResearchInput = {
    company: prep.company,
    role: prep.role,
    jobDescription: prep.jobDescription ?? undefined,
  };

  try {
    const findings = await runResearch(input);
    await updatePrepResearch(prepId, findings);

    const guide = await generateGuide(input, findings);
    await updatePrepGuide(prepId, guide);
  } catch {
    await markPrepFailed(prepId);
  }
}
