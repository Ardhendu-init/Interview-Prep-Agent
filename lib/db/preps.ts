import type { InterviewPrep, Prisma } from "@prisma/client";
import { prisma } from "./client";
import { researchFindingsSchema, prepGuideSchema } from "../validation";
import type {
  ResearchInput,
  ResearchFindings,
  PrepGuide,
  PrepStatus,
  InterviewPrepRecord,
} from "../types";

// JSON columns are typed as Prisma.JsonValue at the DB boundary — validate
// against the Zod schema before trusting the shape, per code-standards.md.
function parseJsonField<T>(
  value: unknown,
  schema: { safeParse: (v: unknown) => { success: boolean; data?: T } },
): T | null {
  if (value === null || value === undefined) {
    return null;
  }
  const result = schema.safeParse(value);
  return result.success ? (result.data as T) : null;
}

function toRecord(row: InterviewPrep): InterviewPrepRecord {
  return {
    id: row.id,
    sessionId: row.sessionId,
    company: row.company,
    role: row.role,
    jobDescription: row.jobDescription,
    researchFindings: parseJsonField<ResearchFindings>(row.researchFindings, researchFindingsSchema),
    guide: parseJsonField<PrepGuide>(row.guide, prepGuideSchema),
    status: row.status as PrepStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createPrep(sessionId: string, input: ResearchInput): Promise<{ id: string }> {
  const prep = await prisma.interviewPrep.create({
    data: {
      sessionId,
      company: input.company,
      role: input.role,
      jobDescription: input.jobDescription ?? null,
      status: "researching",
    },
  });
  return { id: prep.id };
}

// Returns null both when the prep doesn't exist and when it belongs to a
// different session — callers must not be able to distinguish the two cases.
export async function getPrepById(sessionId: string, prepId: string): Promise<InterviewPrepRecord | null> {
  const prep = await prisma.interviewPrep.findFirst({
    where: { id: prepId, sessionId },
  });
  return prep ? toRecord(prep) : null;
}

export async function listPrepsForSession(sessionId: string): Promise<InterviewPrepRecord[]> {
  const preps = await prisma.interviewPrep.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
  });
  return preps.map(toRecord);
}

export async function updatePrepResearch(prepId: string, findings: ResearchFindings): Promise<void> {
  await prisma.interviewPrep.update({
    where: { id: prepId },
    data: {
      researchFindings: findings as unknown as Prisma.InputJsonValue,
      status: "generating_guide",
    },
  });
}

export async function updatePrepGuide(prepId: string, guide: PrepGuide): Promise<void> {
  await prisma.interviewPrep.update({
    where: { id: prepId },
    data: {
      guide: guide as unknown as Prisma.InputJsonValue,
      status: "ready",
    },
  });
}

export async function markPrepFailed(prepId: string): Promise<void> {
  await prisma.interviewPrep.update({
    where: { id: prepId },
    data: { status: "failed" },
  });
}

export async function deletePrep(sessionId: string, prepId: string): Promise<boolean> {
  const result = await prisma.interviewPrep.deleteMany({
    where: { id: prepId, sessionId },
  });
  return result.count > 0;
}
