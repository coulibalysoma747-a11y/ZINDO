import Link from "next/link";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/boutique-en-ligne/commandes", label: "Commandes" },
  { href: "/boutique-en-ligne", label: "Ma vitrine" },
  { href: "/boutique-en-ligne/codes-promo", label: "Codes promo" },
  { href: "/boutique-en-ligne/partager", label: "Partager" },
] as const;

/** Navigation à 4 onglets partagée par les pages Boutique en ligne — chacune est une page à part (pas un état client), comme le reste de l'application. */
export function OnlineStoreTabs({
  active,
  pendingCount = 0,
}: {
  active: "commandes" | "vitrine" | "codes-promo" | "partager";
  pendingCount?: number;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-zinc-200 bg-white p-1">
      {TABS.map((tab) => {
        const key =
          tab.href === "/boutique-en-ligne/commandes"
            ? "commandes"
            : tab.href === "/boutique-en-ligne/partager"
              ? "partager"
              : tab.href === "/boutique-en-ligne/codes-promo"
                ? "codes-promo"
                : "vitrine";
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              key === active ? "bg-zindo-green-600 text-white" : "text-zinc-600 hover:bg-zinc-100"
            )}
          >
            {tab.label}
            {key === "commandes" && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
