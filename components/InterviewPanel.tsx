"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bot, Maximize2, X } from "lucide-react";
import type { PrepGuide, InterviewTurn } from "../lib/types";
import { clampPanelWidth, setPanelWidth as persistPanelWidth } from "../lib/panel-state";
import { MockInterviewChat } from "./MockInterviewChat";

interface InterviewPanelProps {
  prepId: string;
  guide: PrepGuide;
  turns: InterviewTurn[];
  mode: "expanded" | "focus";
  isMobile: boolean;
  width: number;
  onWidthChange: (width: number) => void;
  onExpandToFocus: () => void;
  onBack: () => void;
  onClose: () => void;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function InterviewPanel({
  prepId,
  guide,
  turns,
  mode,
  isMobile,
  width,
  onWidthChange,
  onExpandToFocus,
  onBack,
  onClose,
}: InterviewPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const keyResizeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isFocus = mode === "focus";

  useEffect(() => {
    return () => {
      if (keyResizeTimeout.current) {
        clearTimeout(keyResizeTimeout.current);
      }
    };
  }, []);

  const totalQuestions = guide.questions.length;
  const questionsAsked = turns.filter((t) => t.role === "interviewer").length;

  // Move focus to the panel's first interactive element (answer input, or
  // start button) once, when the panel first mounts (i.e. opens).
  useEffect(() => {
    const target = bodyRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    target?.focus();
  }, []);

  // Focus trap + Escape handling while in focus mode.
  useEffect(() => {
    if (!isFocus) {
      return;
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onBack();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) {
        return;
      }
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusables.length === 0) {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFocus, onBack]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isMobile || isFocus) {
        return;
      }
      e.preventDefault();
      setIsDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [isMobile, isFocus],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) {
        return;
      }
      const next = clampPanelWidth(window.innerWidth - e.clientX, window.innerWidth);
      onWidthChange(next);
    },
    [isDragging, onWidthChange],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) {
        return;
      }
      setIsDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
      persistPanelWidth(width);
    },
    [isDragging, width],
  );

  function handleResizeKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (isMobile || isFocus) {
      return;
    }
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
      return;
    }
    e.preventDefault();
    const step = e.shiftKey ? 40 : 16;
    const delta = e.key === "ArrowLeft" ? step : -step;
    const next = clampPanelWidth(width + delta, window.innerWidth);
    // Keyboard resize is the accessible equivalent of dragging — no easing lag, same as drag.
    setIsDragging(true);
    onWidthChange(next);
    persistPanelWidth(next);
    if (keyResizeTimeout.current) {
      clearTimeout(keyResizeTimeout.current);
    }
    keyResizeTimeout.current = setTimeout(() => setIsDragging(false), 50);
  }

  const targetWidth = isMobile ? "100%" : isFocus ? "100vw" : width;

  return (
    <motion.div
      ref={panelRef}
      role="region"
      aria-label="Mock interview"
      initial={{ width: isMobile ? "100%" : 0 }}
      animate={{ width: targetWidth }}
      exit={{ width: isMobile ? "100%" : 0 }}
      transition={{ duration: isDragging ? 0 : 0.3, ease: "easeInOut" }}
      className={
        isMobile
          ? "fixed inset-x-0 top-14 bottom-14 z-40 flex flex-col overflow-hidden bg-surface"
          : "fixed top-0 right-0 z-40 flex h-dvh flex-col overflow-hidden border-l border-border bg-surface shadow-lg"
      }
    >
      {!isMobile && !isFocus && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize interview panel"
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={handleResizeKeyDown}
          className="absolute top-0 left-0 h-full w-1.5 -translate-x-1/2 cursor-col-resize touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      )}

      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        {isFocus ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-fg-secondary transition-colors hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ArrowLeft className="size-4" />
            Back to Preparation
          </button>
        ) : (
          <div className="flex items-center gap-2 text-sm font-medium text-fg">
            <Bot className="size-4 text-accent" />
            Interview
          </div>
        )}

        <div className="flex items-center gap-2">
          {totalQuestions > 0 && (
            <span className="text-xs text-fg-muted">
              Question {Math.min(questionsAsked, totalQuestions)} of {totalQuestions}
            </span>
          )}
          {!isMobile && !isFocus && (
            <button
              type="button"
              onClick={onExpandToFocus}
              aria-label="Expand to focus mode"
              className="inline-flex size-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Maximize2 className="size-4" />
            </button>
          )}
          {!isMobile && !isFocus && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close interview panel"
              className="inline-flex size-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div ref={bodyRef} className="flex-1 overflow-y-auto p-4">
        <MockInterviewChat prepId={prepId} guide={guide} initialTurns={turns} />
      </div>
    </motion.div>
  );
}
