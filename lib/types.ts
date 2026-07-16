export interface ResearchInput {
  company: string;
  role: string;
  jobDescription?: string;
}

export interface ResearchFindings {
  companyOverview: string;
  interviewProcessNotes: string;
  cultureSignals: string;
  sourcesUsed: string[];
}

export interface PrepConcept {
  topic: string;
  whyItMatters: string;
  resources: { title: string; url: string }[];
}

export interface PrepQuestion {
  question: string;
  category: "technical" | "behavioral" | "domain";
  hint: string;
}

export interface PrepGuide {
  concepts: PrepConcept[];
  questions: PrepQuestion[];
  summary: string;
}

export type PrepStatus = "researching" | "generating_guide" | "ready" | "failed";

export interface InterviewTurn {
  id: string;
  role: "interviewer" | "candidate";
  content: string;
  createdAt: string; // ISO string once serialized from the database
}
