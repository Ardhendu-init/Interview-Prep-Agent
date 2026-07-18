"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Download, AlertTriangle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { InterviewPrepRecord, InterviewTurn, PrepStatus } from "../lib/types";
import { runResearchAndGuide } from "../app/actions";
import { InterviewHeroCTA } from "./InterviewHeroCTA";
import { InterviewPanel } from "./InterviewPanel";
import { PrepBreadcrumb } from "./PrepBreadcrumb";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Skeleton } from "./ui/Skeleton";
import { useToast } from "./ui/Toast";
import {
  clampPanelWidth,
  defaultPanelWidth,
  getPanelOpen,
  getPanelWidth,
  setPanelOpen as persistPanelOpen,
} from "../lib/panel-state";

interface PrepGuideViewProps {
  initialPrep: InterviewPrepRecord;
  initialTurns: InterviewTurn[];
}

const IN_PROGRESS_MESSAGE: Record<"researching" | "generating_guide", string> = {
  researching: "Researching the company…",
  generating_guide: "Writing your prep guide…",
};

const POLL_INTERVAL_MS = 2000;

function isInProgress(status: PrepStatus): status is "researching" | "generating_guide" {
  return status === "researching" || status === "generating_guide";
}

function slugify(company: string): string {
  return company
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function downloadMarkdown(prep: InterviewPrepRecord): void {
  const guide = prep.guide;
  if (!guide) {
    return;
  }
  const research = prep.researchFindings;

  const lines: string[] = [`# ${prep.company} — ${prep.role} Interview Prep`, ""];

  lines.push("## Research Summary", "");
  if (research) {
    lines.push(
      "**Company overview**",
      "",
      research.companyOverview,
      "",
      "**Interview process**",
      "",
      research.interviewProcessNotes,
      "",
      "**Culture signals**",
      "",
      research.cultureSignals,
      "",
    );
  }
  lines.push(guide.summary, "");

  lines.push("## Concepts to Review", "");
  for (const concept of guide.concepts) {
    lines.push(`### ${concept.topic}`, "", concept.whyItMatters, "");
    for (const resource of concept.resources) {
      lines.push(`- [${resource.title}](${resource.url})`);
    }
    lines.push("");
  }

  lines.push("## Practice Questions", "");
  for (const question of guide.questions) {
    lines.push(`### [${question.category}] ${question.question}`, "", `*Hint: ${question.hint}*`, "");
  }

  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(prep.company)}-interview-prep.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function PrepGuideView({ initialPrep, initialTurns }: PrepGuideViewProps) {
  const [prep, setPrep] = useState(initialPrep);
  const [isPending, startTransition] = useTransition();
  const startedRef = useRef(false);
  const { showToast } = useToast();

  // Interview panel UI state — see 22-Interview-panel-redesign.md. Pure UI
  // preference, mirrored to localStorage via lib/panel-state.ts; interview
  // turn history itself still comes from the database via initialTurns.
  const [panelOpen, setPanelOpenState] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [panelWidth, setPanelWidthState] = useState(480);
  const [mobileTab, setMobileTab] = useState<"prep" | "interview">("prep");
  const [isMobile, setIsMobile] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1280);
  const heroCtaRef = useRef<HTMLButtonElement>(null);
  const wasPanelOpenRef = useRef(false);
  const restoredPanelRef = useRef(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    function onResize() {
      setViewportWidth(window.innerWidth);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (restoredPanelRef.current) {
      return;
    }
    restoredPanelRef.current = true;
    const storedWidth = getPanelWidth();
    const width = storedWidth ?? defaultPanelWidth(window.innerWidth);
    setPanelWidthState(clampPanelWidth(width, window.innerWidth));
    // Never restore directly into focus mode — always land in expanded.
    if (getPanelOpen()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring localStorage UI state, unknowable at SSR time, same pattern as ThemeSwitcher.tsx
      setPanelOpenState(true);
    }
  }, []);

  useEffect(() => {
    if (wasPanelOpenRef.current && !panelOpen) {
      heroCtaRef.current?.focus();
    }
    wasPanelOpenRef.current = panelOpen;
  }, [panelOpen]);

  function openPanel() {
    if (isMobile) {
      setMobileTab("interview");
      return;
    }
    setPanelOpenState(true);
    persistPanelOpen(true);
  }

  function closePanel() {
    setPanelOpenState(false);
    setFocusMode(false);
    persistPanelOpen(false);
  }

  function enterFocusMode() {
    setFocusMode(true);
  }

  function exitFocusMode() {
    setFocusMode(false);
  }

  useEffect(() => {
    if (prep.status === "researching" && !startedRef.current) {
      startedRef.current = true;
      startTransition(async () => {
        try {
          await runResearchAndGuide(prep.id);
        } catch {
          setPrep((current) => ({ ...current, status: "failed" }));
        }
      });
    }
  }, [prep.status, prep.id]);

  useEffect(() => {
    if (!isInProgress(prep.status)) {
      return;
    }
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/prep/${prep.id}`);
        if (res.ok) {
          const latest: InterviewPrepRecord = await res.json();
          setPrep(latest);
        }
      } catch {
        // Transient network failure — the next poll tick retries automatically.
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [prep.status, prep.id]);

  function handleRetry() {
    startedRef.current = true;
    setPrep((current) => ({ ...current, status: "researching" }));
    startTransition(async () => {
      try {
        await runResearchAndGuide(prep.id);
      } catch {
        setPrep((current) => ({ ...current, status: "failed" }));
      }
    });
  }

  function handleDownload() {
    downloadMarkdown(prep);
    showToast("Markdown exported", "success");
  }

  if (prep.status === "failed") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <PrepBreadcrumb company={prep.company} />
        <Card className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold text-fg">{prep.company}</h1>
          <p className="flex items-center gap-2 text-sm text-danger">
            <AlertTriangle className="size-4 shrink-0" />
            Something went wrong generating this prep guide.
          </p>
          <Button onClick={handleRetry} disabled={isPending} className="self-start">
            {isPending ? "Retrying…" : "Try again"}
          </Button>
        </Card>
      </div>
    );
  }

  if (isInProgress(prep.status)) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <PrepBreadcrumb company={prep.company} />
        <Card className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-fg">{prep.company}</h1>
            <p className="text-sm text-fg-muted">{prep.role}</p>
          </div>
          <p className="text-sm text-fg-secondary">{IN_PROGRESS_MESSAGE[prep.status]}</p>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const guide = prep.guide;
  if (!guide) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <PrepBreadcrumb company={prep.company} />
        <Card className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold text-fg">{prep.company}</h1>
          <p className="flex items-center gap-2 text-sm text-danger">
            <AlertTriangle className="size-4 shrink-0" />
            Something went wrong generating this prep guide.
          </p>
          <Button onClick={handleRetry} disabled={isPending} className="self-start">
            {isPending ? "Retrying…" : "Try again"}
          </Button>
        </Card>
      </div>
    );
  }

  const research = prep.researchFindings;

  // Desktop-expanded only: push the centered prep column left of the fixed
  // panel and cap its width so it never renders underneath it. Focus mode
  // hides this column entirely, mobile uses the tab bar instead.
  const contentStyle =
    !isMobile && panelOpen && !focusMode
      ? {
          marginRight: panelWidth,
          maxWidth: Math.max(280, Math.min(768, viewportWidth - 32 - panelWidth)),
        }
      : undefined;

  const showPrepContent = isMobile ? mobileTab === "prep" : !focusMode;

  return (
    <>
      {showPrepContent && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={contentStyle}
          className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-20 md:pb-0"
        >
          <PrepBreadcrumb company={prep.company} />

          <InterviewHeroCTA ref={heroCtaRef} turns={initialTurns} onOpen={openPanel} />

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-fg">{prep.company}</h1>
              <p className="text-sm text-fg-muted">{prep.role}</p>
            </div>
            <Button variant="outline" onClick={handleDownload} className="shrink-0">
              <Download className="size-4" />
              <span className="hidden sm:inline">Download Markdown</span>
            </Button>
          </div>

          <Card className="flex flex-col gap-4">
            <h2 className="text-lg font-medium text-fg">Research Summary</h2>
            <p className="text-sm text-fg-secondary">{guide.summary}</p>
            {research && (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                    Company overview
                  </p>
                  <p className="text-sm text-fg-secondary">{research.companyOverview}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                    Interview process
                  </p>
                  <p className="text-sm text-fg-secondary">{research.interviewProcessNotes}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                    Culture signals
                  </p>
                  <p className="text-sm text-fg-secondary">{research.cultureSignals}</p>
                </div>
              </div>
            )}
          </Card>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-medium text-fg">Concepts to Review</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {guide.concepts.map((concept, i) => (
                <Card key={i} hover padding="md" className="flex flex-col gap-2">
                  <p className="font-medium text-fg">{concept.topic}</p>
                  <p className="text-sm text-fg-secondary">{concept.whyItMatters}</p>
                  <div className="flex flex-col gap-1">
                    {concept.resources.map((resource) => (
                      <a
                        key={resource.url}
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-accent hover:underline"
                      >
                        {resource.title}
                      </a>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-medium text-fg">Practice Questions</h2>
            <div className="flex flex-col gap-3">
              {guide.questions.map((question, i) => (
                <Card key={i} hover padding="md" className="flex flex-col gap-2">
                  <span className="self-start rounded-md bg-surface-hover px-2 py-1 text-xs font-medium uppercase tracking-wide text-fg-muted">
                    {question.category}
                  </span>
                  <p className="text-fg">{question.question}</p>
                  <p className="text-sm text-fg-muted">{question.hint}</p>
                </Card>
              ))}
            </div>
          </section>
        </motion.div>
      )}

      <AnimatePresence>
        {!isMobile && panelOpen && (
          <InterviewPanel
            key="desktop-interview-panel"
            prepId={prep.id}
            turns={initialTurns}
            mode={focusMode ? "focus" : "expanded"}
            isMobile={false}
            width={panelWidth}
            onWidthChange={setPanelWidthState}
            onExpandToFocus={enterFocusMode}
            onBack={exitFocusMode}
            onClose={closePanel}
          />
        )}
        {isMobile && mobileTab === "interview" && (
          <InterviewPanel
            key="mobile-interview-panel"
            prepId={prep.id}
            turns={initialTurns}
            mode="focus"
            isMobile
            width={panelWidth}
            onWidthChange={setPanelWidthState}
            onExpandToFocus={() => {}}
            onBack={() => setMobileTab("prep")}
            onClose={() => setMobileTab("prep")}
          />
        )}
      </AnimatePresence>

      <div
        role="tablist"
        aria-label="Prep sections"
        className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-surface md:hidden"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "prep"}
          onClick={() => setMobileTab("prep")}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            mobileTab === "prep" ? "text-accent" : "text-fg-muted"
          }`}
        >
          Preparation
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "interview"}
          onClick={() => setMobileTab("interview")}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            mobileTab === "interview" ? "text-accent" : "text-fg-muted"
          }`}
        >
          Interview
        </button>
      </div>
    </>
  );
}
