"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Mic, MicOff, Send, Volume2, VolumeX } from "lucide-react";
import type { InterviewTurn } from "../lib/types";
import { submitInterviewAnswer } from "../app/actions";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Textarea } from "./ui/Field";
import { useToast } from "./ui/Toast";
import {
  getSpeechRecognitionConstructor,
  type SpeechRecognitionLike,
} from "../lib/speech-recognition-types";
import { getTtsEnabled, setTtsEnabled as persistTtsEnabled } from "../lib/tts-preference";

interface MockInterviewChatProps {
  prepId: string;
  initialTurns: InterviewTurn[];
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

export function MockInterviewChat({ prepId, initialTurns }: MockInterviewChatProps) {
  const [turns, setTurns] = useState(initialTurns);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const [sttSupported, setSttSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseDraftRef = useRef("");

  const [ttsSupported, setTtsSupported] = useState(false);
  const [ttsEnabled, setTtsEnabledState] = useState(false);
  const lastSpokenIndexRef = useRef(initialTurns.length);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, isPending]);

  useEffect(() => {
    // Browser feature support and localStorage aren't knowable at SSR time.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSttSupported(getSpeechRecognitionConstructor() !== null);
    setTtsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    setTtsEnabledState(getTtsEnabled());
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!ttsEnabled || !ttsSupported) {
      lastSpokenIndexRef.current = turns.length;
      return;
    }
    for (let i = lastSpokenIndexRef.current; i < turns.length; i++) {
      const turn = turns[i];
      if (turn.role === "interviewer") {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(turn.content));
      }
    }
    lastSpokenIndexRef.current = turns.length;
  }, [turns, ttsEnabled, ttsSupported]);

  function stopRecording() {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
    }
    recognitionRef.current = null;
    setIsRecording(false);
  }

  function startRecording() {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) {
      setSttSupported(false);
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    baseDraftRef.current = draft;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const base = baseDraftRef.current;
      setDraft(base ? `${base} ${transcript}` : transcript);
    };
    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };
    recognition.onerror = (event) => {
      setIsRecording(false);
      recognitionRef.current = null;
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed" ||
        event.error === "audio-capture"
      ) {
        setSttSupported(false);
        showToast("Voice input isn't available: microphone access was denied.", "error");
      }
    };

    try {
      recognition.start();
    } catch {
      setSttSupported(false);
      return;
    }
    recognitionRef.current = recognition;
    setIsRecording(true);
  }

  function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  function toggleTts() {
    const next = !ttsEnabled;
    setTtsEnabledState(next);
    persistTtsEnabled(next);
    if (!next) {
      window.speechSynthesis?.cancel();
    }
  }

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

    if (isRecording) {
      stopRecording();
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-fg">Mock Interview</h2>
        <button
          type="button"
          onClick={toggleTts}
          disabled={!ttsSupported}
          aria-label={ttsEnabled ? "Disable reading questions aloud" : "Read questions aloud"}
          aria-pressed={ttsEnabled}
          title={
            ttsSupported
              ? undefined
              : "Text-to-speech isn't supported in this browser"
          }
          className={`inline-flex size-8 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 ${
            ttsEnabled ? "text-accent hover:bg-surface-hover" : "text-fg-muted hover:bg-surface-hover hover:text-fg"
          }`}
        >
          {ttsEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
        </button>
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
        <button
          type="button"
          onClick={toggleRecording}
          disabled={isPending || !sttSupported}
          aria-label={isRecording ? "Stop voice input" : "Start voice input"}
          aria-pressed={isRecording}
          title={
            sttSupported ? undefined : "Voice input isn't supported in this browser"
          }
          className={`inline-flex size-9 shrink-0 items-center justify-center rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50 ${
            isRecording
              ? "border-danger bg-danger/10 text-danger"
              : "border-border text-fg-muted hover:border-accent/50 hover:text-accent"
          }`}
        >
          {isRecording ? <MicOff className="size-4" /> : <Mic className="size-4" />}
        </button>
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
