import Link from "next/link";
import { Terminal, UserRound } from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md text-fg transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-fg">
            <Terminal className="size-4" strokeWidth={2.25} />
          </span>
          <span className="text-sm font-semibold tracking-tight">Interview Prep Agent</span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <span
            title="Anonymous session — no account required"
            className="flex size-8 items-center justify-center rounded-full border border-border bg-surface text-fg-muted"
          >
            <UserRound className="size-4" />
          </span>
        </div>
      </div>
    </header>
  );
}
