import Link from "next/link";
import { FolderClock } from "lucide-react";
import type { InterviewPrepRecord } from "../lib/types";
import { formatRelativeTime } from "../lib/format";
import { Card } from "./ui/Card";
import { EmptyState } from "./ui/EmptyState";

interface PrepListProps {
  preps: InterviewPrepRecord[];
}

const STATUS_LABEL: Record<Exclude<InterviewPrepRecord["status"], "ready">, string> = {
  researching: "Researching…",
  generating_guide: "Generating guide…",
  failed: "Failed",
};

export function PrepList({ preps }: PrepListProps) {
  if (preps.length === 0) {
    return (
      <EmptyState
        icon={<FolderClock className="size-5" />}
        title="No prep sessions yet"
        description="Start your first one above — enter a company and role to kick off research and guide generation."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {preps.map((prep, i) => (
        <Link
          key={prep.id}
          href={`/prep/${prep.id}`}
          className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <Card hover padding="md" className="animate-fade-in-up">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-medium text-fg">{prep.company}</p>
                <p className="truncate text-sm text-fg-secondary">{prep.role}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-fg-muted">{formatRelativeTime(prep.createdAt)}</p>
                {prep.status !== "ready" && (
                  <p
                    className={`mt-1 text-xs ${
                      prep.status === "failed" ? "text-danger" : "text-fg-muted"
                    }`}
                  >
                    {STATUS_LABEL[prep.status]}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
