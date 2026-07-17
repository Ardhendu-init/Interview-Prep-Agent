"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPrepAndRunAgent } from "../app/actions";

export function NewPrepForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = company.trim() !== "" && role.trim() !== "" && !isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createPrepAndRunAgent({
        company,
        role,
        jobDescription: jobDescription.trim() === "" ? undefined : jobDescription,
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      router.push(`/prep/${result.prepId}`);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="company" className="text-xs text-neutral-400">
          Company
        </label>
        <input
          id="company"
          type="text"
          required
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="rounded-md border border-neutral-700 bg-neutral-950 text-neutral-100 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="role" className="text-xs text-neutral-400">
          Role
        </label>
        <input
          id="role"
          type="text"
          required
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-md border border-neutral-700 bg-neutral-950 text-neutral-100 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="jobDescription" className="text-xs text-neutral-400">
          Job description (optional)
        </label>
        <textarea
          id="jobDescription"
          rows={4}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          className="rounded-md border border-neutral-700 bg-neutral-950 text-neutral-100 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="self-start rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-neutral-100 text-sm px-4 py-2"
      >
        {isPending ? "Starting…" : "New Prep"}
      </button>
    </form>
  );
}
