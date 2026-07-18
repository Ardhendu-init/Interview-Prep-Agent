"use client";

import { forwardRef } from "react";
import { Rocket } from "lucide-react";
import type { PrepGuide, InterviewTurn } from "../lib/types";
import { Button } from "./ui/Button";

interface InterviewHeroCTAProps {
  guide: PrepGuide;
  turns: InterviewTurn[];
  onOpen: () => void;
}

export const InterviewHeroCTA = forwardRef<HTMLButtonElement, InterviewHeroCTAProps>(
  function InterviewHeroCTA({ guide, turns, onOpen }, ref) {
    const totalQuestions = guide.questions.length;
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
            Resume Interview — Question {Math.min(Math.max(questionsAsked, 1), totalQuestions || 1)} of{" "}
            {totalQuestions}
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
