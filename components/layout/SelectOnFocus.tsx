"use client";

import { useEffect } from "react";

const SELECTABLE_TYPES = new Set(["number", "text", "tel", "email", "search", "url", ""]);

/**
 * Flag selection_auto_champs (lib/select-on-focus.ts). Signalé par le
 * propriétaire : en touchant une case (prix, nom, quantité…), le curseur se
 * plaçait à la fin et ce qu'on tapait s'ajoutait (« 2 » puis 3 → « 23 »). Ici,
 * toucher une case sélectionne son contenu : ce qu'on tape le remplace. Les
 * zones de texte longues (<textarea>), les mots de passe et les cases en
 * lecture seule ne sont pas concernés ; data-no-select="true" exclut une case.
 */
export function SelectOnFocus() {
  useEffect(() => {
    function onFocusIn(event: FocusEvent) {
      const el = event.target;
      if (!(el instanceof HTMLInputElement)) return;
      if (!SELECTABLE_TYPES.has(el.type) || el.readOnly || el.disabled) return;
      if (el.dataset.noSelect === "true" || !el.value) return;
      // Après le placement du curseur par le téléphone, sinon la sélection saute.
      setTimeout(() => {
        if (document.activeElement === el) el.select();
      }, 0);
    }
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);
  return null;
}
