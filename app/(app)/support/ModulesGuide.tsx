import { NAV_ITEMS } from "@/lib/nav";
import { NAV_ICONS } from "@/components/layout/nav-icons";
import { Badge } from "@/components/ui/Badge";

// Une phrase par module, dans l'ordre du menu (lib/nav.ts) — sert de guide de
// référence sur la page Aide. Tenue à jour manuellement : si un module est
// ajouté/retiré du menu, l'ajouter/le retirer ici aussi.
const DESCRIPTIONS: Record<string, string> = {
  "/dashboard": "Vue d'ensemble de votre activité : ventes du jour, alertes de stock, raccourcis vers l'essentiel.",
  "/assistant": "Posez des questions en langage naturel sur votre commerce (ventes, stock, clients...) et obtenez une réponse instantanée.",
  "/ventes": "L'écran de caisse : composez un panier, encaissez et imprimez le ticket ou la facture.",
  "/factures": "Générez une facture détaillée au format A4 plutôt qu'un simple ticket de caisse.",
  "/ventes/historique": "Consultez, filtrez et réimprimez toutes les ventes déjà enregistrées.",
  "/ventes/sessions": "Ouvrez et fermez la caisse par session pour suivre les espèces encaissées par chaque vendeur.",
  "/produits": "Votre catalogue : créez, modifiez et retrouvez tous vos produits, avec photo, prix et référence.",
  "/categories": "Organisez vos produits par catégorie pour les retrouver plus facilement.",
  "/stock": "Suivez chaque mouvement de stock (entrée, sortie, vente, correction) avec l'ancien et le nouveau niveau.",
  "/transferts": "Déplacez du stock d'une boutique ou d'un dépôt vers un autre.",
  "/achats": "Enregistrez vos achats fournisseurs : le stock augmente automatiquement à la réception.",
  "/depenses": "Suivez vos dépenses (loyer, transport, salaires...) pour calculer votre bénéfice réel.",
  "/clients": "Fiches clients avec historique d'achats, coordonnées et crédit éventuel.",
  "/credits": "Suivez les ventes à crédit : qui doit combien, depuis quand, et les remboursements reçus.",
  "/fournisseurs": "Fiches fournisseurs avec historique d'achats et coordonnées.",
  "/inventaire": "Comparez le stock théorique au stock réellement compté dans la boutique et corrigez les écarts.",
  "/historique": "Toutes les opérations de votre commerce (ventes, achats, stock...) réunies au même endroit.",
  "/rapports": "Chiffre d'affaires, bénéfice, produits les plus vendus et valeur du stock sur la période de votre choix.",
  "/boutiques": "Gérez vos différentes boutiques ou dépôts si vous avez plusieurs points de vente.",
  "/boutique-en-ligne": "Une vitrine en ligne pour que vos clients commandent directement, avec suivi des commandes.",
  "/utilisateurs": "Créez des comptes pour vos employés et définissez précisément ce que chacun peut faire.",
  "/abonnement": "Consultez votre formule actuelle et les limites de votre compte, ou changez de palier.",
  "/parametres": "Informations de votre commerce, logo, devise, format des tickets, imprimante...",
};

export function ModulesGuide() {
  const modules = NAV_ITEMS.filter((item) => item.href !== "/support" && DESCRIPTIONS[item.href]);

  return (
    <div>
      <h2 className="font-semibold text-zinc-900">Les {modules.length} modules de ZINDO</h2>
      <p className="mb-3 text-sm text-zinc-500">
        À quoi sert chaque module du menu. Certains n&apos;apparaissent pas dans votre menu si votre rôle ou votre
        formule d&apos;abonnement ne les inclut pas.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          return (
            <div key={item.href} className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-900">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zindo-green-50 text-zindo-green-600">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="font-medium text-zinc-900">{item.label}</p>
                  {item.badge && (
                    <Badge tone="emerald" className="text-[10px]">
                      {item.badge}
                    </Badge>
                  )}
                  {item.planFeature && (
                    <Badge tone="amber" className="text-[10px]">
                      Premium
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">{DESCRIPTIONS[item.href]}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
