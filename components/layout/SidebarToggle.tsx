"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/cn";

// Même nom lu dans app/(app)/layout.tsx (une constante exportée d'un module
// "use client" n'y serait pas lisible côté serveur).
const SIDEBAR_COOKIE = "zindo_sidebar";

/**
 * Ferme/rouvre le menu latéral (ordinateur) sans rendu React : l'attribut
 * `data-sidebar` du conteneur de l'application pilote l'affichage en CSS (voir
 * app/(app)/layout.tsx), et le cookie le fait lire côté serveur au chargement
 * suivant — la barre ne "clignote" donc pas en changeant de page.
 */
function setSidebarClosed(closed: boolean) {
  document.getElementById("zindo-app-shell")?.setAttribute("data-sidebar", closed ? "closed" : "open");
  document.cookie = `${SIDEBAR_COOKIE}=${closed ? "closed" : "open"}; path=/; max-age=31536000; samesite=lax`;
}

export function SidebarCloseButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => setSidebarClosed(true)}
      aria-label="Fermer le menu"
      title="Fermer le menu"
      className={cn("rounded-lg p-1.5 text-zindo-ink-500 hover:bg-zindo-ink-50 hover:text-zindo-ink-900", className)}
    >
      <PanelLeftClose className="h-5 w-5" />
    </button>
  );
}

export function SidebarOpenButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => setSidebarClosed(false)}
      aria-label="Afficher le menu"
      title="Afficher le menu"
      className={cn("items-center gap-1.5 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-slate-800", className)}
    >
      <PanelLeftOpen className="h-5 w-5" />
    </button>
  );
}
