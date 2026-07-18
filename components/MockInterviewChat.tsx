"use client";

import { useState, useTransition } from "react";
import type { PrepGuide, InterviewTurn } from "../lib/types";
import { submitInterviewAnswer } from "../app/actions";

interface MockInterviewChatProps {
  prepId: string;
  guide: PrepGuide;
  initialTurns: InterviewTurn[];
}

export function MockInterviewChat({ prepId, initialTurns }: MockInterviewChatProps) {
  const [turns, setTurns] = useState(initialTurns);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function start() {
    setError(null);
    startTransition(async () => {
      const result = await submitInterviewAnswer(prepId, null);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setTurns((current) => [...current, result.turn]);
    });
  }

  function send() {
    const content = draft.trim();
    if (content === "") {
      return;
    }

    setError(null);
    const optimisticTurn: InterviewTurn = {
      id: `optimistic-${Date.now()}`,
      role: "candidate",
      content,
      createdAt: new Date().toISOString(),
    };
    setTurns((current) => [...current, optimisticTurn]);
    setDraft("");

    startTransition(async () => {
      const result = await submitInterviewAnswer(prepId, content);
      if ("error" in result) {
        setTurns((current) => current.filter((turn) => turn.id !== optimisticTurn.id));
        setError(result.error);
        return;
      }
      setTurns((current) => [...current, result.turn]);
    });
  }

  if (turns.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 flex flex-col gap-3">
        <h2 className="text-lg text-neutral-100">Mock Interview</h2>
        <p className="text-sm text-neutral-400">
          Practice out loud with a live interviewer grounded in this guide.
        </p>
        <button
          type="button"
          onClick={start}
          disabled={isPending}
          className="self-start rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-neutral-100 text-sm px-4 py-2"
        >
          {isPending ? "Starting…" : "Start Mock Interview"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 flex flex-col gap-4">
      <h2 className="text-lg text-neutral-100">Mock Interview</h2>

      <div className="max-h-96 overflow-y-auto flex flex-col gap-4">
        {turns.map((turn) => (
          <div key={turn.id}>
            <p className="text-xs uppercase text-neutral-500">{turn.role}</p>
            <p
              className={`text-sm ${
                turn.role === "interviewer" ? "text-neutral-200" : "text-blue-300"
              }`}
            >
              {turn.content}
            </p>
          </div>
        ))}
        {isPending && <p className="text-sm text-neutral-500">Thinking…</p>}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={isPending}
          placeholder="Type your answer…"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              send();
            }
          }}
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 text-neutral-100 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={send}
          disabled={isPending || draft.trim() === ""}
          className="rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-neutral-100 text-sm px-4 py-2"
        >
          Send
        </button>
      </div>
    </div>
  );
}
