import { NAV_ITEMS } from "@/lib/nav";
import { NAV_ICONS } from "@/components/layout/nav-icons";
import { Badge } from "@/components/ui/Badge";
import { ModuleCard } from "./ModuleCard";

// Une description courte et une explication détaillée par module, dans
// l'ordre du menu (lib/nav.ts) — sert de guide de référence sur la page
// Aide. Tenu à jour manuellement : si un module est ajouté/retiré du menu,
// l'ajouter/le retirer ici aussi.
const DESCRIPTIONS: Record<string, { short: string; long: string }> = {
  "/dashboard": {
    short: "Vue d'ensemble de votre activité : ventes du jour, alertes de stock, raccourcis vers l'essentiel.",
    long: "Votre écran d'accueil. Vous y voyez en un coup d'œil les ventes du jour, la variation par rapport à hier, vos raccourcis vers les actions les plus fréquentes et vos alertes de stock (ruptures, stock faible). Sur ordinateur, des statistiques plus détaillées (bénéfice du jour, chiffre d'affaires du mois, produits les plus vendus, stock par boutique) s'affichent en plus, en dessous.",
  },
  "/assistant": {
    short: "Posez des questions en langage naturel sur votre commerce (ventes, stock, clients...) et obtenez une réponse instantanée.",
    long: "Un assistant à qui vous pouvez poser des questions en français normal — par exemple « combien ai-je vendu aujourd'hui ? » ou « quels produits sont bientôt en rupture ? ». Il consulte les données réelles de votre commerce pour répondre, sans que vous ayez à fouiller dans les rapports vous-même. Réservé aux formules qui incluent l'assistant IA.",
  },
  "/ventes": {
    short: "L'écran de caisse : composez un panier, encaissez et imprimez le ticket ou la facture.",
    long: "L'écran de caisse au quotidien. Recherchez un produit par nom ou code-barres, ajoutez-le au panier, ajustez la quantité et le prix si besoin, choisissez le client et le moyen de paiement, puis validez. Un ticket (ou une facture, selon le mode choisi) est généré et peut s'imprimer automatiquement sans jamais quitter cet écran.",
  },
  "/factures": {
    short: "Générez une facture détaillée au format A4 plutôt qu'un simple ticket de caisse.",
    long: "Comme l'écran de vente, mais le document généré est une facture détaillée au format A4 (tableau ligne par ligne, espace de signature, QR code de vérification) plutôt qu'un ticket de caisse compact — utile pour les clients professionnels ou les grosses commandes.",
  },
  "/ventes/historique": {
    short: "Consultez, filtrez et réimprimez toutes les ventes déjà enregistrées.",
    long: "La liste de toutes les ventes déjà enregistrées, filtrable par période (aujourd'hui, hier, cette semaine, ce mois...). Vous pouvez ouvrir le détail de chaque vente et réimprimer son ticket en un clic.",
  },
  "/ventes/sessions": {
    short: "Ouvrez et fermez la caisse par session pour suivre les espèces encaissées par chaque vendeur.",
    long: "Permet d'ouvrir la caisse en début de journée (ou de service) avec un fond de caisse, puis de la fermer en fin de session pour comparer les espèces attendues et les espèces réellement comptées — utile quand plusieurs vendeurs se relaient sur la même caisse.",
  },
  "/produits": {
    short: "Votre catalogue : créez, modifiez et retrouvez tous vos produits, avec photo, prix et référence.",
    long: "Votre catalogue complet. Chaque produit a un nom, une référence unique, un prix d'achat et de vente, une unité, un stock minimum et, si besoin, une photo et un code-barres. Vous pouvez aussi importer un catalogue entier depuis un PDF fournisseur : l'IA en extrait automatiquement les produits, prix et photos, que vous relisez et corrigez avant de les enregistrer.",
  },
  "/categories": {
    short: "Organisez vos produits par catégorie pour les retrouver plus facilement.",
    long: "Classez vos produits par catégorie (par exemple Freinage, Électricité, Boissons...) pour les retrouver plus vite dans le catalogue et à la caisse.",
  },
  "/stock": {
    short: "Suivez chaque mouvement de stock (entrée, sortie, vente, correction) avec l'ancien et le nouveau niveau.",
    long: "L'historique de tous les mouvements de stock : achats, ventes, corrections d'inventaire, produits endommagés, transferts... Chaque ligne indique la date, le motif, la quantité et le stock avant/après, avec l'utilisateur responsable du mouvement.",
  },
  "/transferts": {
    short: "Déplacez du stock d'une boutique ou d'un dépôt vers un autre.",
    long: "Déplacez du stock entre deux boutiques ou dépôts — par exemple de votre entrepôt vers votre boutique. Le stock est retiré d'un côté et ajouté de l'autre automatiquement, dès que le transfert est validé.",
  },
  "/achats": {
    short: "Enregistrez vos achats fournisseurs : le stock augmente automatiquement à la réception.",
    long: "Enregistrez ce que vous recevez d'un fournisseur : produits, quantités et prix d'achat. Le stock de chaque produit augmente automatiquement dès que l'achat est validé.",
  },
  "/depenses": {
    short: "Suivez vos dépenses (loyer, transport, salaires...) pour calculer votre bénéfice réel.",
    long: "Notez vos charges (loyer, transport, salaires, électricité...) pour que vos rapports de bénéfice reflètent votre rentabilité réelle, pas seulement la différence entre prix d'achat et prix de vente.",
  },
  "/clients": {
    short: "Fiches clients avec historique d'achats, coordonnées et crédit éventuel.",
    long: "Une fiche par client avec ses coordonnées, l'historique complet de ses achats et, si vous vendez à crédit, le montant qu'il vous doit encore.",
  },
  "/credits": {
    short: "Suivez les ventes à crédit : qui doit combien, depuis quand, et les remboursements reçus.",
    long: "Une vue centrée sur les ventes à crédit : qui vous doit de l'argent, combien, depuis quand, et les remboursements déjà reçus. Utile pour savoir qui relancer.",
  },
  "/fournisseurs": {
    short: "Fiches fournisseurs avec historique d'achats et coordonnées.",
    long: "Une fiche par fournisseur avec ses coordonnées et l'historique des achats que vous lui avez passés.",
  },
  "/inventaire": {
    short: "Comparez le stock théorique au stock réellement compté et corrigez les écarts.",
    long: "Comparez ce que le système pense que vous avez en stock (stock théorique) avec ce que vous comptez réellement dans la boutique. Les écarts sont mis en évidence, et vous pouvez valider l'inventaire pour corriger le stock automatiquement.",
  },
  "/historique": {
    short: "Toutes les opérations de votre commerce (ventes, achats, stock...) au même endroit.",
    long: "Toutes les opérations de votre commerce réunies au même endroit — ventes, achats, mouvements de stock, crédits — avec des filtres par période et par type, pour une vue d'ensemble complète.",
  },
  "/rapports": {
    short: "Chiffre d'affaires, bénéfice, produits les plus vendus et valeur du stock sur la période de votre choix.",
    long: "Chiffre d'affaires, bénéfice estimé, produits les plus vendus et valeur du stock, calculés sur la période de votre choix (aujourd'hui, cette semaine, ce mois, ou une période personnalisée).",
  },
  "/boutiques": {
    short: "Gérez vos différentes boutiques ou dépôts si vous avez plusieurs points de vente.",
    long: "Si vous avez plusieurs points de vente ou dépôts, gérez-les ici : création, adresse, type (boutique ou dépôt), et bascule d'une boutique à l'autre pour voir son stock et ses ventes propres.",
  },
  "/boutique-en-ligne": {
    short: "Une vitrine en ligne pour que vos clients commandent directement, avec suivi des commandes.",
    long: "Une vitrine publique où vos clients peuvent parcourir vos produits et passer commande directement sur internet. Les commandes reçues apparaissent dans un tableau de suivi que vous pouvez faire progresser (en préparation, prête, livrée...).",
  },
  "/utilisateurs": {
    short: "Créez des comptes pour vos employés et définissez ce que chacun peut faire.",
    long: "Créez un compte pour chacun de vos employés (vendeur, gestionnaire de stock...) et choisissez précisément ce que chacun a le droit de voir ou de faire dans ZINDO.",
  },
  "/abonnement": {
    short: "Consultez votre formule actuelle et les limites de votre compte, ou changez de palier.",
    long: "Votre formule actuelle (gratuite ou payante), ce qu'elle inclut, et les limites de votre compte (nombre de produits, d'utilisateurs, de boutiques...). Vous pouvez aussi changer de palier depuis cette page.",
  },
  "/parametres": {
    short: "Informations de votre commerce, logo, devise, format des tickets, imprimante...",
    long: "Les informations de votre commerce : nom, logo, téléphone, adresse, devise, format des tickets (58 mm, 80 mm ou A4), message de pied de ticket, et configuration de l'imprimante.",
  },
};

export function ModulesGuide() {
  const modules = NAV_ITEMS.filter((item) => item.href !== "/support" && DESCRIPTIONS[item.href]);

  return (
    <div>
      <h2 className="font-semibold text-zinc-900">Les {modules.length} modules de ZINDO</h2>
      <p className="mb-3 text-sm text-zinc-500">
        Cliquez sur un module pour voir son explication détaillée et y accéder directement. Certains n&apos;apparaissent
        pas dans votre menu si votre rôle ou votre formule d&apos;abonnement ne les inclut pas.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const { short, long } = DESCRIPTIONS[item.href];
          return (
            <ModuleCard
              key={item.href}
              href={item.href}
              label={item.label}
              icon={<Icon className="h-4.5 w-4.5" />}
              shortDescription={short}
              longDescription={long}
              badge={
                <>
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
                </>
              }
            />
          );
        })}
      </div>
    </div>
  );
}
