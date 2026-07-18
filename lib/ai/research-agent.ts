import { generateContent } from "./client";
import { researchFindingsSchema } from "../validation";
import type { ResearchInput, ResearchFindings } from "../types";

const SYSTEM_PROMPT = `You are a research agent for a job-interview prep tool. Given a company name and a job role (and optionally a job description), use Google Search to research the company for a candidate preparing to interview there.

Gather:
- What the company does, and its size/stage (startup, growth, public, etc.)
- Signals about their interview process: search review sites (e.g. Glassdoor, Blind), forums, and blog posts written by past candidates
- Culture and compensation signals, if available

Decide your own search queries based on what you learn. If your initial results are thin, or a specific promising lead is worth following, search again before answering.

This is the single most important rule in this task: before writing anything, check whether your search results are verbatim about a company named exactly the same as the company name given in the request (allowing only for legal suffixes like Inc/Ltd/Pvt Ltd and obvious capitalization differences) — not a company with a similar-sounding or similar-initial name. If the closest search results you found are for a differently-named company, that is NOT a match, even if the names look alike, and you must not use that company's information at all.

If the company is small, obscure, or private and public information is thin, or you cannot find a company matching the exact name given, say so plainly in the relevant field below. Do not invent or guess details you could not find, and do not substitute a different real company's information — fabrication (including reporting about the wrong company) is far worse than an honest "limited information available" or "no company matching this name could be found" answer.

Once you are done searching, respond in exactly this format, with no other text before or after it — always fill in all four labels below, even when the company could not be found or data is thin (e.g. write "No company matching this name could be found." as the COMPANY_OVERVIEW and "N/A" for the remaining fields in that case):

COMPANY_OVERVIEW: <2-4 sentences>
INTERVIEW_PROCESS: <2-4 sentences, or "Limited public data available" if thin>
CULTURE_SIGNALS: <2-3 sentences>
SOURCES: <comma-separated URLs actually used>`;

const FALLBACK_FINDINGS: ResearchFindings = {
  companyOverview:
    "Research could not be completed for this company. You may want to research manually.",
  interviewProcessNotes: "",
  cultureSignals: "",
  sourcesUsed: [],
};

const FIELD_LABELS = [
  "COMPANY_OVERVIEW",
  "INTERVIEW_PROCESS",
  "CULTURE_SIGNALS",
  "SOURCES",
] as const;

function extractField(text: string, label: (typeof FIELD_LABELS)[number]): string {
  const pattern = new RegExp(
    `${label}:\\s*([\\s\\S]*?)(?=\\n(?:${FIELD_LABELS.join("|")}):|$)`,
  );
  return pattern.exec(text)?.[1]?.trim() ?? "";
}

function parseFindings(text: string): unknown {
  const sourcesRaw = extractField(text, "SOURCES");

  return {
    companyOverview: extractField(text, "COMPANY_OVERVIEW"),
    interviewProcessNotes: extractField(text, "INTERVIEW_PROCESS"),
    cultureSignals: extractField(text, "CULTURE_SIGNALS"),
    sourcesUsed: sourcesRaw
      ? sourcesRaw
          .split(",")
          .map((url) => url.trim())
          .filter(Boolean)
      : [],
  };
}

function buildUserPrompt(input: ResearchInput): string {
  const lines = [`Company: ${input.company}`, `Role: ${input.role}`];
  if (input.jobDescription) {
    lines.push(`Job description: ${input.jobDescription}`);
  }
  return lines.join("\n");
}

// Never throws. On any failure (API error, empty/non-STOP response, or a
// parsed result that fails researchFindingsSchema validation) returns
// FALLBACK_FINDINGS — a valid, typed object with an honest "could not
// complete" companyOverview and empty/default values for the rest.
export async function runResearch(input: ResearchInput): Promise<ResearchFindings> {
  let response;
  try {
    response = await generateContent({
      contents: buildUserPrompt(input),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ googleSearch: {} }],
        maxOutputTokens: 8192,
      },
    });
  } catch (error) {
    console.error("[research-agent] runResearch failed:", error);
    return { ...FALLBACK_FINDINGS };
  }

  const finishReason = response.candidates?.[0]?.finishReason;
  const text = response.text;
  if (!text || finishReason !== "STOP") {
    console.error("[research-agent] runResearch got a non-STOP or empty response:", {
      finishReason,
      text,
    });
    return { ...FALLBACK_FINDINGS };
  }

  const result = researchFindingsSchema.safeParse(parseFindings(text));
  if (!result.success) {
    console.error("[research-agent] runResearch got a response that failed validation:", result.error);
    return { ...FALLBACK_FINDINGS };
  }

  return result.data;
}
