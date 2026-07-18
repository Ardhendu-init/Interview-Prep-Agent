import { genAI, MODEL } from "./client";
import { prepGuideSchema } from "../validation";
import type { ResearchInput, ResearchFindings, PrepGuide } from "../types";

const SYSTEM_PROMPT = `You are a study-guide generator for a job-interview prep tool. Given a company/role and research findings about that company, produce a tailored interview prep guide.

Output strict JSON only — no markdown code fences, no preamble, no trailing text. The JSON must match exactly this shape:

{
  "summary": string,
  "concepts": [
    { "topic": string, "whyItMatters": string, "resources": [{ "title": string, "url": string }] }
  ],
  "questions": [
    { "question": string, "category": "technical" | "behavioral" | "domain", "hint": string }
  ]
}

Rules:
1. Produce 5-8 concepts. Each concept needs 1-3 resources that are real, well-known references (official docs, MDN, established educational sites). Never invent a URL you are not confident is real — omit a resource rather than guess one.
2. Every "whyItMatters" must be tied to the specific company and role from the research findings given below — reference concrete details from those findings (the product, industry, tech signals, interview-process notes), not generic career advice. This is the single most important quality bar: a whyItMatters that could apply to any company at random is wrong.
3. Produce 6-10 questions mixing "technical", "behavioral", and "domain" categories, grounded in what the research found. If the research findings point to something specific about the company's product or domain, at least one question should reflect that specifically rather than being generic.
4. If the research findings are thin (e.g. company could not be found), still produce a genuinely useful guide grounded in the role alone — do not fabricate company-specific claims not supported by the findings.`;

const FALLBACK_GUIDE: PrepGuide = {
  summary: "The guide could not be generated. Please try again.",
  concepts: [],
  questions: [],
};

function buildUserPrompt(input: ResearchInput, research: ResearchFindings): string {
  const lines = [
    `Company: ${input.company}`,
    `Role: ${input.role}`,
    input.jobDescription ? `Job description: ${input.jobDescription}` : null,
    "",
    `Company overview: ${research.companyOverview}`,
    `Interview process notes: ${research.interviewProcessNotes}`,
    `Culture signals: ${research.cultureSignals}`,
  ].filter((line): line is string => line !== null);
  return lines.join("\n");
}

function parseGuide(text: string): unknown {
  const stripped = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(stripped);
  } catch {
    return null;
  }
}

// Never throws. On any failure (API error, empty/non-STOP response, JSON
// parse failure, or a parsed result that fails prepGuideSchema validation)
// returns FALLBACK_GUIDE — a valid, typed object with an honest
// "could not be generated" summary and empty concepts/questions.
export async function generateGuide(
  input: ResearchInput,
  research: ResearchFindings,
): Promise<PrepGuide> {
  let response;
  try {
    response = await genAI.models.generateContent({
      model: MODEL,
      contents: buildUserPrompt(input, research),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      },
    });
  } catch (error) {
    console.error("[guide-generator] generateGuide failed:", error);
    return { ...FALLBACK_GUIDE };
  }

  const finishReason = response.candidates?.[0]?.finishReason;
  const text = response.text;
  if (!text || finishReason !== "STOP") {
    console.error("[guide-generator] generateGuide got a non-STOP or empty response:", {
      finishReason,
      text,
    });
    return { ...FALLBACK_GUIDE };
  }

  const parsed = parseGuide(text);
  if (parsed === null) {
    console.error("[guide-generator] generateGuide got a response that failed JSON parsing:", text);
    return { ...FALLBACK_GUIDE };
  }

  const result = prepGuideSchema.safeParse(parsed);
  if (!result.success) {
    console.error("[guide-generator] generateGuide got a response that failed validation:", result.error);
    return { ...FALLBACK_GUIDE };
  }

  return result.data;
}
