import { forwardRef } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const FIELD_BASE =
  "w-full rounded-md border bg-bg text-fg px-3 py-2 text-sm placeholder:text-fg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className = "", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid}
      className={`${FIELD_BASE} ${invalid ? "border-danger" : "border-border"} ${className}`}
      {...props}
    />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className = "", ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid}
      className={`${FIELD_BASE} resize-none ${invalid ? "border-danger" : "border-border"} ${className}`}
      {...props}
    />
  );
});

export function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={`text-xs font-medium text-fg-muted ${props.className ?? ""}`} />;
}
