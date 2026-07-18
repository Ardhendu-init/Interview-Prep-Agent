import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
}

const PADDING_CLASSES: Record<NonNullable<CardProps["padding"]>, string> = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function Card({ hover = false, padding = "lg", className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-border bg-surface shadow-sm transition-all duration-200 ${PADDING_CLASSES[padding]} ${
        hover ? "hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md" : ""
      } ${className}`}
      {...props}
    />
  );
}
