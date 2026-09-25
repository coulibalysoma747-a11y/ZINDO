"use client";

import { useEffect, useRef } from "react";

/**
 * Affiche un document au format A4 en entier sur un petit écran (téléphone) :
 * réduit par `zoom` pour tenir dans la largeur disponible, comme un aperçu
 * PDF, au lieu de déborder. `zoom` (contrairement à transform: scale) réduit
 * aussi la hauteur occupée, donc pas de grand vide sous le document.
 * L'impression garde toujours la taille réelle.
 */
export function FitToWidth({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fit() {
      if (!outer.current || !inner.current) return;
      inner.current.style.zoom = "1";
      const available = outer.current.clientWidth;
      const natural = inner.current.scrollWidth;
      inner.current.style.zoom = natural > available ? String(available / natural) : "1";
    }
    fit();
    window.addEventListener("resize", fit);
    const reset = () => {
      if (inner.current) inner.current.style.zoom = "1";
    };
    window.addEventListener("beforeprint", reset);
    window.addEventListener("afterprint", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("beforeprint", reset);
      window.removeEventListener("afterprint", fit);
    };
  }, []);

  return (
    <div ref={outer} className="w-full overflow-hidden print:overflow-visible">
      <style>{"@media print { [data-fit-to-width] { zoom: 1 !important; } }"}</style>
      <div ref={inner} data-fit-to-width className="mx-auto w-fit">
        {children}
      </div>
    </div>
  );
}
