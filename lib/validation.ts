import { z } from "zod";

export const researchInputSchema = z.object({
  company: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  jobDescription: z.string().max(5000).optional(),
});

export const resourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
});

export const prepConceptSchema = z.object({
  topic: z.string().min(1),
  whyItMatters: z.string().min(1),
  resources: z.array(resourceSchema).min(1).max(3),
});

export const prepQuestionSchema = z.object({
  question: z.string().min(1),
  category: z.enum(["technical", "behavioral", "domain"]),
  hint: z.string().min(1),
});

export const prepGuideSchema = z.object({
  summary: z.string().min(1),
  concepts: z.array(prepConceptSchema).max(10),
  questions: z.array(prepQuestionSchema).max(15),
});

export const researchFindingsSchema = z.object({
  companyOverview: z.string(),
  interviewProcessNotes: z.string(),
  cultureSignals: z.string(),
  sourcesUsed: z.array(z.string()),
});

export const candidateAnswerSchema = z.string().trim().min(1).max(5000);
