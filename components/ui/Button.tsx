import { cn } from "@/lib/cn";
import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-zindo-green-500 to-zindo-green-600 text-white shadow-sm shadow-zindo-green-900/20 ring-1 ring-inset ring-white/10 hover:from-zindo-green-600 hover:to-zindo-green-700 hover:shadow-md hover:shadow-zindo-green-900/20 active:from-zindo-green-700 active:to-zindo-green-700 disabled:from-zindo-green-500/40 disabled:to-zindo-green-500/40 disabled:shadow-none",
  secondary:
    "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 active:bg-zinc-300 disabled:text-zinc-400 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
  danger:
    "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-sm shadow-red-900/20 ring-1 ring-inset ring-white/10 hover:from-red-600 hover:to-red-700 hover:shadow-md active:from-red-700 active:to-red-700 disabled:from-red-300 disabled:to-red-300 disabled:shadow-none",
  ghost: "bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200 dark:hover:bg-slate-800",
  outline:
    "bg-white text-zinc-700 border border-zinc-200 shadow-zindo-card hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 active:bg-zinc-100 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 rounded-lg px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

const BASE_CLASSES =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold tracking-[-0.005em] transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zindo-green-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(BASE_CLASSES, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn(BASE_CLASSES, variantClasses[variant], sizeClasses[size], className)}>
      {children}
    </Link>
  );
}
