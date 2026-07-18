import { NextResponse } from "next/server";
import { getSessionIdFromCookie } from "../../../../lib/session";
import { getPrepById } from "../../../../lib/db/preps";

// Read-only status poll for PrepGuideView's live "researching" ->
// "generating_guide" -> "ready" progression. Deliberately a Route Handler,
// not a Server Action — see code-standards.md's Next.js section for why:
// Next.js's client runtime processes every "use server" call from a page
// through one sequential action queue, so a Server-Action-based poll queues
// behind the long-running runResearchAndGuide action and never reaches the
// server until it resolves, defeating live polling. This performs no
// mutation and calls no AI provider, so it doesn't fall under the
// Server-Actions-only rule (which is scoped to mutating/AI-calling
// operations, per architecture.md).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = await getSessionIdFromCookie();
  const prep = sessionId ? await getPrepById(sessionId, id) : null;

  if (!prep) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(prep);
}
