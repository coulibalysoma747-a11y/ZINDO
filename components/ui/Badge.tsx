import { cn } from "@/lib/cn";

type Tone = "emerald" | "red" | "amber" | "zinc" | "blue" | "gold";

const toneClasses: Record<Tone, string> = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
  red: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-400/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20",
  zinc: "bg-zinc-100 text-zinc-700 ring-zinc-500/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600/40",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-400/20",
  gold: "bg-zindo-gold-50 text-zindo-gold-700 ring-zindo-gold-600/20 dark:bg-zindo-gold-500/10 dark:text-zindo-gold-400 dark:ring-zindo-gold-400/20",
};

export function Badge({
  tone = "zinc",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
