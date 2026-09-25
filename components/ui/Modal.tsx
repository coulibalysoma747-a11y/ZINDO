"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    // Sur téléphone la fenêtre s'ouvre depuis le bas (plus facile à atteindre
    // au pouce) ; sur ordinateur, elle reste centrée.
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="animate-zindo-fade-in absolute inset-0 bg-zindo-ink-950/50 backdrop-blur-[3px]" onClick={onClose} />
      <div className="animate-zindo-fade-in-up relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-zindo-float ring-1 ring-zinc-900/5 sm:max-h-[88vh] sm:rounded-2xl sm:pb-0 dark:bg-slate-900 dark:ring-white/10">
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-zinc-200 sm:hidden" />
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-slate-800">
          <h3 className="font-semibold tracking-tight text-zinc-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
