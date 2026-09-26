import { cn } from "@/lib/cn";
import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const FIELD_BASE =
  "w-full rounded-lg border border-zinc-300 bg-white text-sm text-zinc-900 shadow-[0_1px_2px_rgb(16_24_20/0.04)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zindo-green-500 focus:ring-4 focus:ring-zindo-green-500/15 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 disabled:hover:border-zinc-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:focus:ring-zindo-green-700/30 dark:disabled:bg-slate-800/60";

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...props}
      className={cn("mb-1.5 block text-[13px] font-semibold text-zinc-700", props.className)}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(FIELD_BASE, "h-10 px-3", props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(FIELD_BASE, "px-3 py-2", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(FIELD_BASE, "h-10 px-3", props.className)} />;
}

export function Field({
  label,
  htmlFor,
  error,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>}
      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
