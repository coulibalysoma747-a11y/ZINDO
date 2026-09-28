"use client";

import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { subscribeNewsletter } from "@/lib/actions/newsletter";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await subscribeNewsletter(email, website);
      if (res.ok) {
        setEmail("");
        setMessage({ ok: true, text: "Merci ! Vous êtes inscrit." });
      } else {
        setMessage({ ok: false, text: res.error });
      }
    });
  }

  return (
    <form onSubmit={submit} className="w-full sm:max-w-md">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Votre adresse e-mail"
          aria-label="Votre adresse e-mail"
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-zindo-ink-200 focus:border-zindo-green-400 focus:outline-none"
        />
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="hidden"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-zindo-green-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-zindo-green-600 disabled:opacity-60"
        >
          {pending ? "Envoi…" : "S'abonner"} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <p className={`mt-2 text-xs ${message ? (message.ok ? "text-zindo-green-400" : "text-zindo-red-400") : "text-zindo-ink-200"}`}>
        {message?.text ?? "Pas de spam. Désinscription sur simple demande."}
      </p>
    </form>
  );
}
