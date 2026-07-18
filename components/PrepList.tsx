"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { FolderClock, Trash2 } from "lucide-react";
import type { InterviewPrepRecord } from "../lib/types";
import { formatRelativeTime } from "../lib/format";
import { deletePrepAction } from "../app/actions";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { EmptyState } from "./ui/EmptyState";

interface PrepListProps {
  preps: InterviewPrepRecord[];
}

const STATUS_LABEL: Record<Exclude<InterviewPrepRecord["status"], "ready">, string> = {
  researching: "Researching…",
  generating_guide: "Generating guide…",
  failed: "Failed",
};

export function PrepList({ preps: initialPreps }: PrepListProps) {
  const [preps, setPreps] = useState(initialPreps);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function handleDelete(prepId: string) {
    startTransition(async () => {
      try {
        const result = await deletePrepAction(prepId);
        if ("error" in result) {
          setErrors((current) => ({ ...current, [prepId]: result.error }));
          setConfirmingId(null);
          return;
        }
        setPreps((current) => current.filter((p) => p.id !== prepId));
      } catch {
        setErrors((current) => ({ ...current, [prepId]: "Something went wrong — please try again." }));
        setConfirmingId(null);
      }
    });
  }

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
      {preps.map((prep, i) => {
        const isConfirming = confirmingId === prep.id;
        const error = errors[prep.id];

        return (
          <Card
            key={prep.id}
            hover={!isConfirming}
            padding="md"
            className="relative animate-fade-in-up"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {isConfirming ? (
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-fg">Delete this prep?</p>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setConfirmingId(null)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(prep.id)}
                    disabled={isPending}
                  >
                    {isPending ? "Deleting…" : "Delete"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setConfirmingId(prep.id);
                  }}
                  aria-label={`Delete prep for ${prep.role} at ${prep.company}`}
                  className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-md text-neutral-500 transition-colors hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Trash2 className="size-3.5" />
                </button>
                <Link
                  href={`/prep/${prep.id}`}
                  className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div className="flex items-start justify-between gap-4 pr-8">
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
                </Link>
                {error && (
                  <p role="alert" className="mt-2 text-xs text-danger">
                    {error}
                  </p>
                )}
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
}
