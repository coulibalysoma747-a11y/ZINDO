import { Inbox, type LucideIcon } from "lucide-react";

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/40 px-6 py-14 text-center dark:border-slate-800 dark:bg-slate-900/40">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-zinc-400 shadow-zindo-card ring-1 ring-zinc-200/70 dark:bg-slate-800 dark:ring-slate-700">
        <Icon className="h-5 w-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-zinc-900">{title}</p>
        {description && <p className="mx-auto max-w-sm text-sm text-zinc-500">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
