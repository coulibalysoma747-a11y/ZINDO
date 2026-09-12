export type ThemePreference = "LIGHT" | "DARK" | "SYSTEM";

const MEDIA_QUERY = "(prefers-color-scheme: dark)";

declare global {
  interface Window {
    __zindoThemeMedia?: MediaQueryList;
    __zindoThemeListener?: (e: MediaQueryListEvent) => void;
  }
}

function detachSystemListener() {
  if (window.__zindoThemeMedia && window.__zindoThemeListener) {
    window.__zindoThemeMedia.removeEventListener("change", window.__zindoThemeListener);
  }
  window.__zindoThemeMedia = undefined;
  window.__zindoThemeListener = undefined;
}

/** Applique immédiatement le thème choisi (sans rechargement de page). */
export function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  detachSystemListener();

  if (theme === "DARK") {
    root.classList.add("dark");
    return;
  }
  if (theme === "LIGHT") {
    root.classList.remove("dark");
    return;
  }

  // SYSTEM : suit la préférence du système d'exploitation, y compris si elle
  // change pendant que l'onglet est ouvert.
  const media = window.matchMedia(MEDIA_QUERY);
  root.classList.toggle("dark", media.matches);
  const listener = (e: MediaQueryListEvent) => root.classList.toggle("dark", e.matches);
  media.addEventListener("change", listener);
  window.__zindoThemeMedia = media;
  window.__zindoThemeListener = listener;
}
