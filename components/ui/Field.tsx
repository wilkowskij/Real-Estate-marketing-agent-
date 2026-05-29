import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted",
        className
      )}
      {...props}
    />
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-lg border border-paper-line bg-white px-3.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold/20",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-lg border border-paper-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold/20",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-lg border border-paper-line bg-white px-3 text-sm text-ink focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold/20",
        className
      )}
      {...props}
    />
  );
}
