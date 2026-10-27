import { cn } from "@/lib/cn";
import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "outline" | "accent";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-zindo-blue-600 to-zindo-blue-700 text-white shadow-md shadow-zindo-blue-900/20 hover:from-zindo-blue-500 hover:to-zindo-blue-600 hover:shadow-lg hover:shadow-zindo-blue-900/25 active:from-zindo-blue-700 active:to-zindo-blue-800 disabled:from-zindo-blue-600/40 disabled:to-zindo-blue-600/40 disabled:shadow-none",
  accent:
    "bg-gradient-to-b from-zindo-copper-400 to-zindo-copper-400 text-zindo-ink-900 shadow-md shadow-zindo-copper-700/25 hover:from-zindo-copper-300 hover:to-zindo-copper-300 hover:shadow-lg active:from-zindo-copper-500 active:to-zindo-copper-500 disabled:from-zindo-copper-400/50 disabled:to-zindo-copper-400/50 disabled:shadow-none",
  secondary:
    "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 active:bg-zinc-300 disabled:text-zinc-400 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
  danger:
    "bg-gradient-to-b from-red-600 to-red-700 text-white shadow-md shadow-red-900/20 hover:from-red-500 hover:to-red-600 hover:shadow-lg hover:shadow-red-900/25 active:from-red-700 active:to-red-800 disabled:from-red-300 disabled:to-red-300 disabled:shadow-none",
  ghost: "bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200 dark:hover:bg-slate-800",
  outline:
    "bg-white text-zinc-800 border border-zinc-300 shadow-zindo-card hover:border-zindo-blue-400 hover:bg-zindo-blue-50/40 hover:text-zindo-blue-900 active:bg-zindo-blue-100/60 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 rounded-lg px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

const BASE_CLASSES =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 disabled:pointer-events-none disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zindo-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900";

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
