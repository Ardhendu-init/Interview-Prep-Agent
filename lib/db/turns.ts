import { prisma } from "./client";
import type { InterviewTurn as InterviewTurnRow } from "@prisma/client";
import type { InterviewTurn } from "../types";

function toRecord(row: InterviewTurnRow): InterviewTurn {
  return {
    id: row.id,
    role: row.role as InterviewTurn["role"],
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listTurnsForPrep(prepId: string): Promise<InterviewTurn[]> {
  const turns = await prisma.interviewTurn.findMany({
    where: { prepId },
    orderBy: { createdAt: "asc" },
  });
  return turns.map(toRecord);
}

export async function appendTurn(
  prepId: string,
  role: "interviewer" | "candidate",
  content: string,
): Promise<InterviewTurn> {
  const turn = await prisma.interviewTurn.create({
    data: { prepId, role, content },
  });
  return toRecord(turn);
}
