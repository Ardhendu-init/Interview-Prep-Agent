import { getSessionIdFromCookie } from "../lib/session";
import { listPrepsForSession } from "../lib/db/preps";
import { NewPrepForm } from "../components/NewPrepForm";
import { PrepList } from "../components/PrepList";

export default async function Home() {
  const sessionId = await getSessionIdFromCookie();
  const preps = sessionId ? await listPrepsForSession(sessionId) : [];

  return (
    <main className="flex flex-1 flex-col max-w-3xl w-full mx-auto px-4 py-10 gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Interview Prep Agent</h1>
        <p className="text-sm text-fg-muted">
          Research a company, generate a tailored prep guide, and run an adaptive mock interview —
          all in one place.
        </p>
      </div>
      <NewPrepForm />
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-medium text-fg">Past Preps</h2>
        <PrepList preps={preps} />
      </div>
    </main>
  );
}
