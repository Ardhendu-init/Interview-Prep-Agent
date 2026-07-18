"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPrepAndRunAgent } from "../app/actions";
import { Button } from "./ui/Button";
import { Input, Label, Textarea } from "./ui/Field";
import { Card } from "./ui/Card";
import { useToast } from "./ui/Toast";

export function NewPrepForm() {
  const router = useRouter();
  const { showToast } = useToast();
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
        showToast(result.error, "error");
        return;
      }

      showToast(`Started prep for ${company}`, "success");
      router.push(`/prep/${result.prepId}`);
    });
  }

  return (
    <Card padding="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            type="text"
            required
            placeholder="e.g. Stripe"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role">Role</Label>
          <Input
            id="role"
            type="text"
            required
            placeholder="e.g. Backend Engineer"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="jobDescription">Job description (optional)</Label>
          <Textarea
            id="jobDescription"
            rows={4}
            placeholder="Paste the job posting for a more tailored guide…"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" disabled={!canSubmit} className="self-start">
          {isPending ? "Starting…" : "New Prep"}
        </Button>
      </form>
    </Card>
  );
}
