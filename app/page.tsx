import { getSessionIdFromCookie } from "../lib/session";
import { listPrepsForSession } from "../lib/db/preps";
import { NewPrepForm } from "../components/NewPrepForm";
import { PrepList } from "../components/PrepList";

export default async function Home() {
  const sessionId = await getSessionIdFromCookie();
  const preps = sessionId ? await listPrepsForSession(sessionId) : [];

  return (
    <main className="flex flex-1 flex-col max-w-3xl w-full mx-auto py-10 gap-8">
      <h1 className="text-2xl text-neutral-100">Interview Prep Agent</h1>
      <NewPrepForm />
      <PrepList preps={preps} />
    </main>
  );
}
