import Link from "next/link";
import { EllipsisVertical } from "lucide-react";

/** Liens de l'en-tête public (cahier des charges « Accueil public + Marché »). */
const LINKS = [
  { href: "/", label: "Accueil", emoji: "🏠" },
  { href: "/marche", label: "Marché", menuLabel: "Voir le Marché", emoji: "🛒" },
  { href: "/fonctionnalites", label: "Gestion commerciale", emoji: "💼" },
  { href: "/tarifs", label: "Tarifs", emoji: "💰" },
  { href: "/#faq", label: "FAQ", emoji: "❓" },
];

const CONTACT_WHATSAPP = "https://wa.me/22604059929";

/** Navigation visible sur ordinateur (à partir de lg). */
export function PublicNavLinks() {
  return (
    <nav className="hidden items-center gap-1 lg:flex">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={
            l.href === "/marche"
              ? "rounded-xl px-3 py-2 text-sm font-bold text-zindo-green-700 hover:bg-zindo-green-100"
              : "rounded-xl px-3 py-2 text-sm font-semibold text-zindo-ink-700 hover:text-zindo-green-600"
          }
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

/** Menu ⋮ sur téléphone et tablette (sans JavaScript : <details>). */
export function PublicNavMenu() {
  return (
    <details className="group relative lg:hidden">
      <summary
        aria-label="Menu"
        className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-zinc-200 text-zindo-ink-700 hover:border-zinc-300 [&::-webkit-details-marker]:hidden"
      >
        <EllipsisVertical className="h-5 w-5" />
      </summary>
      <div className="absolute right-0 top-12 z-40 w-72 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl">
        <p className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-zinc-400">Menu</p>
        {LINKS.filter((l) => l.href !== "/").map((l) => (
          <Link key={l.href} href={l.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zindo-ink-900 hover:bg-zinc-50">
            <span>{l.emoji}</span> {l.menuLabel ?? l.label}
          </Link>
        ))}
        <div className="my-1 border-t border-zinc-100" />
        <Link href="/login" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zindo-ink-900 hover:bg-zinc-50">
          <span>🔐</span> Se connecter
        </Link>
        <Link href="/inscription" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-zindo-green-700 hover:bg-zindo-green-100">
          <span>🚀</span> Essai gratuit
        </Link>
        <a href={CONTACT_WHATSAPP} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zindo-ink-900 hover:bg-zinc-50">
          <span>📞</span> Nous contacter <span className="ml-auto whitespace-nowrap text-xs text-zinc-400">04 05 99 29</span>
        </a>
      </div>
    </details>
  );
}
