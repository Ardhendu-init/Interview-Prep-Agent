"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Send, Timer } from "lucide-react";
import type { PrepGuide, InterviewTurn } from "../lib/types";
import { submitInterviewAnswer } from "../app/actions";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Textarea } from "./ui/Field";
import { useToast } from "./ui/Toast";

interface MockInterviewChatProps {
  prepId: string;
  guide: PrepGuide;
  initialTurns: InterviewTurn[];
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-surface-hover px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-typing-dot rounded-full bg-fg-muted"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export function MockInterviewChat({ prepId, guide, initialTurns }: MockInterviewChatProps) {
  const [turns, setTurns] = useState(initialTurns);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const totalQuestions = guide.questions.length;
  const questionsAsked = turns.filter((t) => t.role === "interviewer").length;
  const completionPct =
    totalQuestions > 0 ? Math.min(100, Math.round((questionsAsked / totalQuestions) * 100)) : 0;

  const startedAt = useMemo(() => (turns.length > 0 ? new Date(turns[0].createdAt).getTime() : null), [turns]);

  useEffect(() => {
    if (startedAt === null) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initializes the live clock immediately, then the interval below keeps it ticking
    setElapsedMs(Date.now() - startedAt);
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, isPending]);

  function start() {
    setError(null);
    startTransition(async () => {
      const result = await submitInterviewAnswer(prepId, null);
      if ("error" in result) {
        setError(result.error);
        showToast(result.error, "error");
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
        showToast(result.error, "error");
        return;
      }
      setTurns((current) => [...current, result.turn]);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  if (turns.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-11 items-center justify-center rounded-full bg-surface-hover text-accent">
          <MessageCircle className="size-5" />
        </div>
        <h2 className="text-lg font-medium text-fg">Mock Interview</h2>
        <p className="max-w-sm text-sm text-fg-muted">
          Practice out loud with a live interviewer grounded in this guide.
        </p>
        <Button onClick={start} disabled={isPending}>
          {isPending ? "Starting…" : "Start Mock Interview"}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </Card>
    );
  }

  return (
    <Card padding="md" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-fg">Mock Interview</h2>
          <div className="flex items-center gap-3 text-xs text-fg-muted">
            {totalQuestions > 0 && (
              <span>
                Question {Math.min(questionsAsked, totalQuestions)} of {totalQuestions}
              </span>
            )}
            {startedAt !== null && (
              <span className="flex items-center gap-1">
                <Timer className="size-3.5" />
                {formatElapsed(elapsedMs)}
              </span>
            )}
          </div>
        </div>
        {totalQuestions > 0 && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-surface-hover">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={false}
              animate={{ width: `${completionPct}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        )}
      </div>

      <div
        className="flex max-h-112 flex-col gap-4 overflow-y-auto px-0.5 py-1"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence initial={false}>
          {turns.map((turn) => {
            const isInterviewer = turn.role === "interviewer";
            return (
              <motion.div
                key={turn.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex flex-col gap-1 ${isInterviewer ? "items-start" : "items-end"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                    isInterviewer
                      ? "rounded-bl-sm bg-surface-hover text-fg"
                      : "rounded-br-sm bg-accent text-accent-fg"
                  }`}
                >
                  {turn.content}
                </div>
                <span className="px-1 text-[10px] text-fg-muted">
                  {isInterviewer ? "Interviewer" : "You"} · {formatTimestamp(turn.createdAt)}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-start gap-1"
          >
            <TypingIndicator />
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          placeholder="Type your answer… (Enter to send, Shift+Enter for a new line)"
          rows={2}
          className="flex-1"
        />
        {/* Reserved for future voice input — deliberately no icon/handler, see 22-Interview-panel-redesign.md */}
        <div className="size-9 shrink-0" aria-hidden="true" />
        <Button
          onClick={send}
          disabled={isPending || draft.trim() === ""}
          aria-label="Send answer"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </Card>
  );
}
