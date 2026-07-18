import Link from "next/link";
import { getSessionIdFromCookie } from "../../../lib/session";
import { getPrepById } from "../../../lib/db/preps";
import { listTurnsForPrep } from "../../../lib/db/turns";
import { PrepGuideView } from "../../../components/PrepGuideView";

interface PrepPageProps {
  params: Promise<{ id: string }>;
}

export default async function PrepPage({ params }: PrepPageProps) {
  const { id } = await params;
  const sessionId = await getSessionIdFromCookie();
  const prep = sessionId ? await getPrepById(sessionId, id) : null;

  if (!prep) {
    return (
      <main className="flex flex-1 flex-col max-w-3xl w-full mx-auto py-10 gap-4">
        <p className="text-sm text-neutral-300">Prep not found.</p>
        <Link href="/" className="text-sm text-blue-400">
          Back to home
        </Link>
      </main>
    );
  }

  const turns = prep.status === "ready" ? await listTurnsForPrep(prep.id) : [];

  return (
    <main className="flex flex-1 flex-col max-w-3xl w-full mx-auto py-10 gap-8">
      <PrepGuideView initialPrep={prep} initialTurns={turns} />
    </main>
  );
}
