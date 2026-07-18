"use server";

import { revalidatePath } from "next/cache";
import { getOrCreateSession } from "../lib/db/session";
import {
  createPrep,
  getPrepById,
  updatePrepResearch,
  updatePrepGuide,
  markPrepFailed,
  deletePrep,
} from "../lib/db/preps";
import { listTurnsForPrep, appendTurn } from "../lib/db/turns";
import { researchInputSchema, candidateAnswerSchema } from "../lib/validation";
import { runResearch } from "../lib/ai/research-agent";
import { generateGuide } from "../lib/ai/guide-generator";
import { interviewTurn } from "../lib/ai/mock-interviewer";
import type { ResearchInput, InterviewTurn } from "../lib/types";

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

  try {
    const prep = await getPrepById(sessionId, prepId);
    if (!prep) {
      return;
    }

    const input: ResearchInput = {
      company: prep.company,
      role: prep.role,
      jobDescription: prep.jobDescription ?? undefined,
    };

    const findings = await runResearch(input);
    await updatePrepResearch(prepId, findings);

    const guide = await generateGuide(input, findings);
    await updatePrepGuide(prepId, guide);
  } catch {
    await markPrepFailed(prepId);
  }
}

// Re-fetches turn history from the database (rather than trusting
// client-passed history) so a stale or multi-tab client can never diverge
// from the persisted state the model actually sees.
export async function submitInterviewAnswer(
  prepId: string,
  candidateAnswer: string | null,
): Promise<{ turn: InterviewTurn } | { error: string }> {
  const { id: sessionId } = await getOrCreateSession();

  const prep = await getPrepById(sessionId, prepId);
  if (!prep || prep.status !== "ready" || !prep.guide) {
    return { error: "This prep isn't ready yet." };
  }

  if (candidateAnswer !== null) {
    const parsed = candidateAnswerSchema.safeParse(candidateAnswer);
    if (!parsed.success) {
      return { error: "Please provide an answer before submitting." };
    }
    await appendTurn(prepId, "candidate", parsed.data);
  }

  const history = await listTurnsForPrep(prepId);

  const input: ResearchInput = {
    company: prep.company,
    role: prep.role,
    jobDescription: prep.jobDescription ?? undefined,
  };

  const reply = await interviewTurn(input, prep.guide, history);
  const turn = await appendTurn(prepId, "interviewer", reply);

  return { turn };
}

export async function deletePrepAction(prepId: string): Promise<{ success: boolean } | { error: string }> {
  const { id: sessionId } = await getOrCreateSession();
  const deleted = await deletePrep(sessionId, prepId);
  if (!deleted) return { error: "Couldn't delete that — it may not exist or isn't yours." };
  revalidatePath("/");
  return { success: true };
}
