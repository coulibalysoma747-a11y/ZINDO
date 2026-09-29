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
          <PublicHelpChat onClose={() => setOpen(false)} />
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
