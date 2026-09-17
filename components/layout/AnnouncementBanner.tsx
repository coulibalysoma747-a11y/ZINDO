"use client";

import { useEffect, useState } from "react";
import { Megaphone, X, AlertTriangle } from "lucide-react";

const STORAGE_KEY = "zindo_dismissed_announcement";

export function AnnouncementBanner({ message, tone }: { message: string; tone: "info" | "warning" }) {
  const [dismissed, setDismissed] = useState(true); // masqué tant qu'on n'a pas vérifié le localStorage (évite un flash)

  // Lecture post-montage volontaire : le rendu serveur ne connaît pas le
  // localStorage du visiteur, donc l'état "masqué" ci-dessus (qui évite un
  // flash de la bannière) doit être corrigé une fois côté client.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(localStorage.getItem(STORAGE_KEY) === message);
    } catch {
      setDismissed(false); // localStorage indisponible (navigation privée...) : on affiche par défaut
    }
  }, [message]);

  if (dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, message);
    } catch {
      // Pas grave : la bannière réapparaîtra à la prochaine visite.
    }
  }

  const Icon = tone === "warning" ? AlertTriangle : Megaphone;
  const toneClass = tone === "warning" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-blue-50 text-blue-800 border-blue-200";

  return (
    <div className={`flex items-center justify-between gap-3 border-b px-4 py-2 text-sm print:hidden ${toneClass}`}>
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        {message}
      </span>
      <button type="button" onClick={dismiss} aria-label="Fermer" className="shrink-0 rounded p-1 hover:bg-black/5">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
