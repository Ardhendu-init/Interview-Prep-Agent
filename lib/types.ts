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

export interface InterviewPrepRecord {
  id: string;
  sessionId: string;
  company: string;
  role: string;
  jobDescription: string | null;
  researchFindings: ResearchFindings | null;
  guide: PrepGuide | null;
  status: PrepStatus;
  createdAt: string; // ISO string once serialized from the database
  updatedAt: string; // ISO string once serialized from the database
}

export interface InterviewTurn {
  id: string;
  role: "interviewer" | "candidate";
  content: string;
  createdAt: string; // ISO string once serialized from the database
}
