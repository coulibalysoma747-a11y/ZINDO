import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Numéros affichés : première, dernière et voisines de la page courante (0 = « … »). */
function pageNumbers(current: number, total: number): number[] {
  const wanted = new Set([1, total, current - 1, current, current + 1].filter((n) => n >= 1 && n <= total));
  const sorted = [...wanted].sort((a, b) => a - b);
  return sorted.flatMap((n, i) => (i > 0 && n - sorted[i - 1] > 1 ? [0, n] : [n]));
}

/**
 * Pied de liste paginée : « Éléments 31 à 60 sur 245 » + pages.
 * `href(page)` construit le lien d'une page en gardant les filtres en cours.
 */
export function Pagination({
  page,
  pageSize,
  total,
  href,
  noun = "éléments",
}: {
  page: number;
  pageSize: number;
  total: number;
  href: (page: number) => string;
  noun?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600">
      <p>{total === 0 ? `Aucun ${noun.replace(/s$/, "")}` : `${noun.charAt(0).toUpperCase()}${noun.slice(1)} ${from + 1} à ${Math.min(from + pageSize, total)} sur ${total}`}</p>
      {pages > 1 && (
        <nav className="flex items-center gap-1" aria-label="Pages">
          <Arrow href={href(page - 1)} disabled={page <= 1} label="Page précédente">
            <ChevronLeft className="h-4 w-4" />
          </Arrow>
          {pageNumbers(page, pages).map((n, i) =>
            n === 0 ? (
              <span key={`gap-${i}`} className="px-1 text-zinc-400">
                …
              </span>
            ) : (
              <Link
                key={n}
                href={href(n)}
                aria-current={n === page ? "page" : undefined}
                className={
                  n === page
                    ? "flex h-9 min-w-9 items-center justify-center rounded-lg bg-zinc-900 px-2 font-semibold text-white"
                    : "flex h-9 min-w-9 items-center justify-center rounded-lg bg-white px-2 ring-1 ring-zinc-200 hover:bg-zinc-50"
                }
              >
                {n}
              </Link>
            )
          )}
          <Arrow href={href(page + 1)} disabled={page >= pages} label="Page suivante">
            <ChevronRight className="h-4 w-4" />
          </Arrow>
        </nav>
      )}
    </div>
  );
}

function Arrow({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  if (disabled) return <span className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-300">{children}</span>;
  return (
    <Link href={href} aria-label={label} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white ring-1 ring-zinc-200 hover:bg-zinc-50">
      {children}
    </Link>
  );
}

/** Numéro de page lu dans l'URL (1 par défaut, jamais négatif). */
export function readPage(value: string | undefined): number {
  return Math.max(1, Math.floor(Number(value) || 1));
}
