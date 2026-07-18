"use client";

import { useEffect, useRef, useState } from "react";
import type { InterviewPrepRecord, InterviewTurn, PrepStatus } from "../lib/types";
import { runResearchAndGuide } from "../app/actions";
import { MockInterviewChat } from "./MockInterviewChat";

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
  const startedRef = useRef(false);

  useEffect(() => {
    if (prep.status === "researching" && !startedRef.current) {
      startedRef.current = true;
      runResearchAndGuide(prep.id);
    }
  }, [prep.status, prep.id]);

  useEffect(() => {
    if (!isInProgress(prep.status)) {
      return;
    }
    const interval = setInterval(async () => {
      const res = await fetch(`/api/prep/${prep.id}`);
      if (res.ok) {
        const latest: InterviewPrepRecord = await res.json();
        setPrep(latest);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [prep.status, prep.id]);

  function handleRetry() {
    startedRef.current = true;
    setPrep((current) => ({ ...current, status: "researching" }));
    runResearchAndGuide(prep.id);
  }

  if (prep.status === "failed") {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 flex flex-col gap-3">
        <h1 className="text-2xl text-neutral-100">{prep.company}</h1>
        <p className="text-sm text-red-400">
          Something went wrong generating this prep guide.
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className="self-start rounded-md bg-blue-600 hover:bg-blue-500 text-neutral-100 text-sm px-4 py-2"
        >
          Try again
        </button>
      </div>
    );
  }

  if (isInProgress(prep.status)) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 flex flex-col gap-2">
        <h1 className="text-2xl text-neutral-100">{prep.company}</h1>
        <p className="text-sm text-neutral-300">{IN_PROGRESS_MESSAGE[prep.status]}</p>
      </div>
    );
  }

  const guide = prep.guide;
  if (!guide) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 flex flex-col gap-3">
        <h1 className="text-2xl text-neutral-100">{prep.company}</h1>
        <p className="text-sm text-red-400">
          Something went wrong generating this prep guide.
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className="self-start rounded-md bg-blue-600 hover:bg-blue-500 text-neutral-100 text-sm px-4 py-2"
        >
          Try again
        </button>
      </div>
    );
  }

  const research = prep.researchFindings;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-100">{prep.company}</h1>
          <p className="text-sm text-neutral-400">{prep.role}</p>
        </div>
        <button
          type="button"
          onClick={() => downloadMarkdown(prep)}
          className="shrink-0 rounded-md border border-neutral-700 text-neutral-100 text-sm px-4 py-2 hover:border-neutral-600"
        >
          Download Markdown
        </button>
      </div>

      <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 flex flex-col gap-4">
        <h2 className="text-lg text-neutral-100">Research Summary</h2>
        <p className="text-sm text-neutral-300">{guide.summary}</p>
        {research && (
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs uppercase text-neutral-500">Company overview</p>
              <p className="text-sm text-neutral-300">{research.companyOverview}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-neutral-500">Interview process</p>
              <p className="text-sm text-neutral-300">{research.interviewProcessNotes}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-neutral-500">Culture signals</p>
              <p className="text-sm text-neutral-300">{research.cultureSignals}</p>
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg text-neutral-100">Concepts to Review</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {guide.concepts.map((concept, i) => (
            <div
              key={i}
              className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 flex flex-col gap-2"
            >
              <p className="text-neutral-100">{concept.topic}</p>
              <p className="text-sm text-neutral-300">{concept.whyItMatters}</p>
              <div className="flex flex-col gap-1">
                {concept.resources.map((resource) => (
                  <a
                    key={resource.url}
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-400 hover:underline"
                  >
                    {resource.title}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg text-neutral-100">Practice Questions</h2>
        <div className="flex flex-col gap-3">
          {guide.questions.map((question, i) => (
            <div
              key={i}
              className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 flex flex-col gap-2"
            >
              <span className="self-start rounded-md bg-neutral-800 text-xs uppercase text-neutral-400 px-2 py-1">
                {question.category}
              </span>
              <p className="text-neutral-100">{question.question}</p>
              <p className="text-sm text-neutral-400">{question.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <MockInterviewChat prepId={prep.id} guide={guide} initialTurns={initialTurns} />
    </div>
  );
}
