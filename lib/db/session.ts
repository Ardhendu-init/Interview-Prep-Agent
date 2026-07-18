import { prisma } from "./client";
import { getSessionIdFromCookie, setSessionCookie } from "../session";

export async function getOrCreateSession(): Promise<{ id: string }> {
  const existingId = await getSessionIdFromCookie();

  if (existingId) {
    const session = await prisma.session.findUnique({
      where: { id: existingId },
    });
    if (session) {
      return { id: session.id };
    }
  }

  const session = await prisma.session.create({ data: {} });
  await setSessionCookie(session.id);
  return { id: session.id };
}
