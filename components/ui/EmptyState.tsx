import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-14 px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-surface text-accent">
        {icon}
      </div>
      <p className="text-fg">{title}</p>
      <p className="max-w-sm text-sm text-fg-muted">{description}</p>
      {action}
    </div>
  );
}
