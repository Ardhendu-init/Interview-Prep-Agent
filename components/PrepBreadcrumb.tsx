import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";

export function PrepBreadcrumb({ company }: { company: string }) {
  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm text-fg-muted transition-colors hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <ArrowLeft className="size-4" />
        Back to Home
      </Link>

      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-fg-muted">
        <Link href="/" className="transition-colors hover:text-fg">
          Home
        </Link>
        <ChevronRight className="size-3" />
        <span className="truncate text-fg-secondary" aria-current="page">
          {company} Interview
        </span>
      </nav>
    </div>
  );
}
