import { cn } from "@/lib/cn";
import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-zindo-green-600 text-white shadow-sm shadow-zindo-green-900/10 hover:bg-zindo-green-700 active:bg-zindo-green-800 disabled:bg-zindo-green-600/40 disabled:shadow-none",
  secondary:
    "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 active:bg-zinc-300 disabled:text-zinc-400 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
  danger:
    "bg-red-600 text-white shadow-sm shadow-red-900/10 hover:bg-red-700 active:bg-red-800 disabled:bg-red-300 disabled:shadow-none",
  ghost: "bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200 dark:hover:bg-slate-800",
  outline:
    "bg-white text-zinc-800 border border-zinc-300 shadow-zindo-card hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-900 active:bg-zinc-100 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 rounded-lg px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

const BASE_CLASSES =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-100 disabled:pointer-events-none disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zindo-green-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900";

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
