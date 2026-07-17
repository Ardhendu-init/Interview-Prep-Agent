import Link from "next/link";
import type { InterviewPrepRecord } from "../lib/types";
import { formatRelativeTime } from "../lib/format";

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
      <p className="text-center text-sm text-neutral-400 py-10">
        No prep sessions yet — start your first one above.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {preps.map((prep) => (
        <Link
          key={prep.id}
          href={`/prep/${prep.id}`}
          className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-700"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-neutral-100">{prep.company}</p>
              <p className="text-sm text-neutral-300">{prep.role}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-neutral-500">{formatRelativeTime(prep.createdAt)}</p>
              {prep.status !== "ready" && (
                <p
                  className={`text-xs mt-1 ${
                    prep.status === "failed" ? "text-red-400" : "text-neutral-400"
                  }`}
                >
                  {STATUS_LABEL[prep.status]}
                </p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
