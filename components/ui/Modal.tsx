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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="animate-zindo-fade-in absolute inset-0 bg-zinc-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="animate-zindo-fade-in-up relative w-full max-w-md rounded-2xl bg-white shadow-2xl shadow-zinc-900/20 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-slate-800">
          <h3 className="font-semibold tracking-tight text-zinc-900">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
