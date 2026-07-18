"use client";

import { forwardRef } from "react";
import { Rocket } from "lucide-react";
import type { InterviewTurn } from "../lib/types";
import { Button } from "./ui/Button";

interface InterviewHeroCTAProps {
  turns: InterviewTurn[];
  onOpen: () => void;
}

export const InterviewHeroCTA = forwardRef<HTMLButtonElement, InterviewHeroCTAProps>(
  function InterviewHeroCTA({ turns, onOpen }, ref) {
    const questionsAsked = turns.filter((t) => t.role === "interviewer").length;
    const inProgress = turns.length > 0;

    return (
      <Button
        ref={ref}
        onClick={onOpen}
        className="w-full justify-center gap-2 sm:w-auto"
      >
        {inProgress ? (
          <>
            <span className="size-2 shrink-0 rounded-full bg-success" aria-hidden="true" />
            Resume Interview — {questionsAsked} {questionsAsked === 1 ? "exchange" : "exchanges"} so far
          </>
        ) : (
          <>
            <Rocket className="size-4" />
            Start AI Interview
          </>
        )}
      </Button>
    );
  },
);
