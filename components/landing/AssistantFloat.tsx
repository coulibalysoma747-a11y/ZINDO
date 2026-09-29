"use client";

import { useState } from "react";
import { Bot, X } from "lucide-react";
import { PublicHelpChat } from "@/components/PublicHelpChat";

/** Bulle de l'assistant IA, placée à gauche de la bulle WhatsApp ; ouvre la discussion. */
export function AssistantFloat() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div className="zindo-appear fixed inset-x-3 bottom-20 z-40 sm:inset-x-auto sm:right-5 sm:w-[380px]">
          <div className="mb-2 flex items-center justify-between rounded-2xl bg-zinc-950 shadow-lg px-4 py-3 text-white">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="h-4 w-4 text-zindo-green-300" /> Assistant ZINDO
            </p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer l'assistant" className="rounded-lg p-1 hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>
          <PublicHelpChat />
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Fermer l'assistant" : "Poser une question à l'assistant ZINDO"}
        title="Une question ? L'assistant ZINDO répond tout de suite"
        aria-expanded={open}
        className="fixed bottom-5 right-20 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-950 text-white shadow-lg shadow-black/15 transition hover:scale-105"
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-6 w-6" />}
      </button>
    </>
  );
}
