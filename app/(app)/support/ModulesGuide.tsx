import { NAV_ITEMS } from "@/lib/nav";
import { NAV_ICONS } from "@/components/layout/nav-icons";
import type { ModuleAvailability, ModuleUnavailableReason } from "@/lib/nav-server";
import { Badge } from "@/components/ui/Badge";
import { ModuleCard } from "./ModuleCard";

const UNAVAILABLE_MESSAGES: Record<ModuleUnavailableReason, string> = {
  permission: "Votre rôle actuel n'a pas accès à ce module.",
  feature: "Cette fonctionnalité n'est pas encore activée pour votre compte.",
  plan: "Non inclus dans votre formule d'abonnement actuelle.",
  activity: "Ce module ne s'applique pas à votre type d'activité.",
  module: "Masqué depuis Paramètres — réactivez-le dans la section Modules.",
};

// Une description courte et une explication détaillée par module, dans
// l'ordre du menu (lib/nav.ts) — sert de guide de référence sur la page
// Aide. Tenu à jour manuellement : si un module est ajouté/retiré du menu,
// l'ajouter/le retirer ici aussi.
export const DESCRIPTIONS: Record<string, { short: string; long: string }> = {
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
  "/devis": {
    short: "Préparez un devis pour un client, sans toucher au stock, puis convertissez-le en vente une fois accepté.",
    long: "Composez un devis produit par produit pour un client, avec une date de validité — aucun impact sur le stock tant qu'il n'est pas transformé en vente. Suivez son statut (brouillon, envoyé, accepté, refusé) et convertissez-le en une vraie vente en un clic une fois le client d'accord, sans ressaisir les articles.",
  },
  "/immatriculation-engins": {
    short: "Suivez le dossier d'immatriculation de chaque moto vendue : CMC, WW, dépôt au ministère, récépissé, carte grise.",
    long: "Un dossier démarre automatiquement à chaque vente d'engin. Tant que la vente n'est pas soldée, seul le reçu est remis au client — le WW (carte provisoire) ne peut être émis qu'une fois le paiement complet. Suivez ensuite chaque étape jusqu'à la remise de la carte grise : CMC, WW émis, dépôt au ministère, récépissé reçu puis remis, carte grise reçue puis remise. Réservé à l'activité « Boutique de motos ».",
  },
  "/vente-engin": {
    short: "Vente dédiée d'un engin (moto) : choisir le modèle puis l'exemplaire précis, encaisser, imprimer le reçu.",
    long: "Écran de vente spécialisé pour un engin à suivi individuel : choisissez le modèle de moto, puis l'exemplaire précis par son numéro de châssis, encaissez et imprimez le reçu — sans passer par le panier multi-articles de l'écran de vente général. Réservé à l'activité « Boutique de motos ».",
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
  "/marques": {
    short: "Gérez la liste des marques de vos produits.",
    long: "Créez, renommez ou supprimez les marques de vos produits — retrouvées ensuite dans le sélecteur du formulaire produit et dans le filtre de la liste des produits.",
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
  "/parametres": {
    short: "Informations de votre commerce, logo, devise, format des tickets, imprimante...",
    long: "Les informations de votre commerce : nom, logo, téléphone, adresse, devise, format des tickets (58 mm, 80 mm ou A4), message de pied de ticket, et configuration de l'imprimante.",
  },
  "/notifications": {
    short: "Alertes automatiques : stock faible, rupture, inventaire à faire, crédit échu.",
    long: "Un fil d'alertes générées automatiquement à partir de l'état réel de votre commerce : produit en rupture ou sous son seuil minimum, échéance de crédit dépassée, ou inventaire recommandé si aucun n'a été fait depuis longtemps. Marquez-les comme lues une fois traitées.",
  },
  "/rappels-credit": {
    short: "Relancez vos clients qui doivent encore de l'argent, en un clic WhatsApp.",
    long: "La liste de vos crédits clients en cours, avec un bouton qui ouvre WhatsApp avec un message de rappel déjà rédigé — plus besoin de composer le message vous-même à chaque relance.",
  },
  "/reassort": {
    short: "Produits sous leur seuil minimum, avec une quantité à recommander suggérée.",
    long: "Repère automatiquement les produits dont le stock est descendu à ou sous leur seuil minimum, et suggère une quantité à recommander pour ne pas repasser sous l'alerte dès la prochaine vente. Un lien direct permet de créer l'achat correspondant.",
  },
  "/prix-de-revient": {
    short: "Coût moyen réel (historique des achats) à comparer au prix d'achat renseigné sur la fiche produit.",
    long: "Calcule le coût de revient moyen pondéré à partir de l'historique réel de vos achats, et le compare au simple prix d'achat déclaré sur la fiche produit — utile pour repérer un produit dont la marge affichée ne correspond plus à ce que vous payez vraiment.",
  },
  "/photos-produits": {
    short: "Ajoutez ou remplacez la photo de n'importe quel produit en un clic, depuis une seule grille.",
    long: "Une grille de tout votre catalogue : cliquez sur une vignette pour prendre ou choisir une photo, sans avoir à ouvrir la fiche complète de chaque produit un par un.",
  },
  "/location": {
    short: "Prêtez du matériel à un client contre un tarif journalier, distinct d'une vente.",
    long: "Suivez le prêt d'un produit à un client (tarif par jour, caution, date de retour prévue) sans que ce soit une vente — le statut passe automatiquement à « En retard » si la date de retour prévue est dépassée sans que le matériel soit revenu.",
  },
  "/approvisionnement": {
    short: "Faites entrer de la marchandise en stock en 30 secondes, sans fournisseur ni bon de commande.",
    long: "Pour une livraison reçue sans fournisseur enregistré (achat de dépannage, marché...) : indiquez le produit (ou créez-le à la volée s'il n'existe pas encore), la quantité et le prix payé, et le stock est mis à jour immédiatement. Pour un achat organisé avec un vrai fournisseur, utilisez plutôt le module Achats.",
  },
  "/enlevements": {
    short: "Un confrère prend de la marchandise chez vous : suivi du solde dû, sans toucher votre chiffre d'affaires.",
    long: "L'inverse de l'approvisionnement rapide : quand un confrère vient prendre de la marchandise chez vous, enregistrez-le ici avec ce qu'il a laissé et ce qui reste dû. Le stock sort immédiatement, mais ce montant n'entre jamais dans votre chiffre d'affaires (ce n'est pas une vente). Relancez le solde par WhatsApp en un clic si un numéro est renseigné.",
  },
  "/expeditions": {
    short: "Suivez un colis envoyé par transporteur pour une vente en gros à distance, avec ses frais de transport.",
    long: "Pour une vente à un client éloigné livrée par transporteur (gare routière...) : suivez le transporteur, le numéro de bordereau, le statut (envoyé, arrivé, retiré) et surtout les frais de transport avancés — trop petits pour qu'on y pense un par un, mais qui s'accumulent vite. Ne touche jamais au stock, déjà sorti par la facture liée. Un message de suivi WhatsApp est prêt à partir si un numéro de destinataire est renseigné.",
  },
  "/caisse": {
    short: "Récupérez un panier envoyé par un vendeur (module Vente) et finalisez le paiement.",
    long: "Avec « Caisse à deux » activé (Paramètres > Modules), un vendeur prépare un panier sur Vente et clique « Envoyer à la caisse » sans encaisser. Ici, récupérez ce panier dans la file d'attente (retiré dès qu'il est récupéré, pour ne jamais être pris deux fois) et finalisez le paiement — c'est seulement à ce moment que le stock est déduit. Nécessite la permission « Encaisser depuis la file d'attente », à accorder dans Rôles et permissions.",
  },
};

export function ModulesGuide({ availability }: { availability: Record<string, ModuleAvailability> }) {
  const modules = NAV_ITEMS.filter((item) => item.href !== "/support" && DESCRIPTIONS[item.href]);

  return (
    <div>
      <h2 className="font-semibold text-zinc-900">Les {modules.length} modules de ZINDO</h2>
      <p className="mb-3 text-sm text-zinc-500">
        Cliquez sur un module pour voir son explication détaillée et y accéder directement. Un module grisé
        n&apos;est pas disponible sur votre compte — la carte indique pourquoi, sans lien vers la page.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const { short, long } = DESCRIPTIONS[item.href];
          const moduleAvailability = availability[item.href] ?? { allowed: true, reason: null };
          return (
            <ModuleCard
              key={item.href}
              href={item.href}
              label={item.label}
              icon={<Icon className="h-4.5 w-4.5" />}
              shortDescription={short}
              longDescription={long}
              available={moduleAvailability.allowed}
              unavailableMessage={moduleAvailability.reason ? UNAVAILABLE_MESSAGES[moduleAvailability.reason] : undefined}
              badge={
                <>
                  {item.badge && (
                    <Badge tone="emerald" className="text-[10px]">
                      {item.badge}
                    </Badge>
                  )}
                  {moduleAvailability.reason === "plan" && (
                    <Badge tone="amber" className="text-[10px]">
                      Premium
                    </Badge>
                  )}
                  {!moduleAvailability.allowed && moduleAvailability.reason !== "plan" && (
                    <Badge tone="zinc" className="text-[10px]">
                      Indisponible
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
