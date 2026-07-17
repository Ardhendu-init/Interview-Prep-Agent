import { genAI, MODEL } from "./client";
import type { ResearchInput, PrepGuide, InterviewTurn } from "../types";

const SYSTEM_PROMPT = `You are role-playing as a live interviewer conducting a mock interview for a specific candidate. You will be given the company/role being interviewed for, and a prep guide (a concept list and a question bank) grounded in research about that company and role — use it as your source of material, but you are not limited to reading questions verbatim from it.

Rules for every turn:
1. Ask exactly one question per turn. Never ask multiple questions in the same turn.
2. If this is the first turn (no prior conversation), skip feedback entirely and just ask an opening question.
3. On every turn after the first, first give brief (1-2 sentence) feedback on the candidate's previous answer, then choose your next question based on how strong that answer was: if it was shallow or vague, probe deeper on the same topic; if it was strong, move on to a new topic or category.
4. Mix categories across the conversation — do not ask several technical questions back to back, or several behavioral questions back to back.
5. Keep your own turns short, the way a real interviewer paces a conversation — do not write an essay or over-explain.`;

const FALLBACK_MESSAGE =
  "Sorry, let's pick this back up — can you repeat or rephrase your last answer?";

function buildGuideContext(guide: PrepGuide): string {
  const concepts = guide.concepts
    .map((c) => `- ${c.topic}: ${c.whyItMatters}`)
    .join("\n");
  const questions = guide.questions
    .map((q) => `- [${q.category}] ${q.question}`)
    .join("\n");
  return `Concept list:\n${concepts}\n\nQuestion bank:\n${questions}`;
}

function buildSystemInstruction(input: ResearchInput, guide: PrepGuide): string {
  return `${SYSTEM_PROMPT}\n\nYou are interviewing a candidate for the ${input.role} role at ${input.company}.\n\n${buildGuideContext(guide)}`;
}

function toGeminiRole(role: InterviewTurn["role"]): "user" | "model" {
  return role === "candidate" ? "user" : "model";
}

// Never throws. On any failure (API error, or an empty/non-STOP response)
// returns FALLBACK_MESSAGE — a graceful in-character recovery line, since a
// mid-interview crash is a worse experience than a slightly awkward one.
export async function interviewTurn(
  input: ResearchInput,
  guide: PrepGuide,
  history: InterviewTurn[],
): Promise<string> {
  const contents =
    history.length > 0
      ? history.map((turn) => ({
          role: toGeminiRole(turn.role),
          parts: [{ text: turn.content }],
        }))
      : "Begin the interview with your opening question.";

  let response;
  try {
    response = await genAI.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: buildSystemInstruction(input, guide),
        maxOutputTokens: 1024,
      },
    });
  } catch {
    return FALLBACK_MESSAGE;
  }

  const finishReason = response.candidates?.[0]?.finishReason;
  const text = response.text;
  if (!text || finishReason !== "STOP") {
    return FALLBACK_MESSAGE;
  }

  return text.trim();
}
