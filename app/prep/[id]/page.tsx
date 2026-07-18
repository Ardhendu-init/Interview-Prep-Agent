import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
      <main className="flex flex-1 flex-col max-w-3xl w-full mx-auto px-4 py-10 gap-4">
        <p className="text-sm text-fg-secondary">Prep not found.</p>
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-accent hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
      </main>
    );
  }

  const turns = prep.status === "ready" ? await listTurnsForPrep(prep.id) : [];

  return (
    <main className="relative flex flex-1 flex-col w-full px-4 py-10 gap-8">
      <PrepGuideView initialPrep={prep} initialTurns={turns} />
    </main>
  );
}
