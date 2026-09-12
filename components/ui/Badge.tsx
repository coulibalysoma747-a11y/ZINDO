import { cn } from "@/lib/cn";

type Tone = "emerald" | "red" | "amber" | "zinc" | "blue";

const toneClasses: Record<Tone, string> = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  zinc: "bg-zinc-100 text-zinc-700 ring-zinc-500/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
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
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
