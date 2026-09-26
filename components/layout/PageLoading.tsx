/**
 * Squelette affiché instantanément au clic sur un lien du menu, pendant que
 * le serveur prépare la page (voir les loading.tsx). Sans lui, l'écran
 * restait figé sur l'ancienne page jusqu'à la fin du rendu serveur, et Next
 * ne pouvait rien précharger des pages dynamiques.
 */
export function PageLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Chargement">
      <div className="space-y-2">
        <div className="h-6 w-48 rounded-lg bg-zinc-200/80 dark:bg-slate-800" />
        <div className="h-4 w-72 max-w-full rounded-lg bg-zinc-100 dark:bg-slate-800/60" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-zinc-100 dark:bg-slate-800/60" />
        ))}
      </div>
      <div className="h-72 rounded-2xl bg-zinc-100 dark:bg-slate-800/60" />
    </div>
  );
}
