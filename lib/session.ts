import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "interview_prep_session";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export async function getSessionIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function setSessionCookie(id: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: ONE_YEAR_IN_SECONDS,
    path: "/",
  });
}
