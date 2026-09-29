/**
 * Squelette affiché instantanément pendant le chargement d'une page du Marché
 * (recherche, catégorie, boutique…) : la connexion depuis l'Afrique de l'Ouest
 * ajoute souvent plus d'une demi-seconde, l'utilisateur voit tout de suite
 * que la page arrive.
 */
export default function MarketLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Chargement">
      <div className="h-7 w-56 rounded-lg bg-zinc-200" />
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-24 rounded-full bg-zinc-200" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200">
            <div className="aspect-square bg-zinc-200" />
            <div className="space-y-2 p-3">
              <div className="h-3.5 w-full rounded bg-zinc-200" />
              <div className="h-3.5 w-2/3 rounded bg-zinc-200" />
              <div className="h-5 w-1/2 rounded bg-zinc-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
