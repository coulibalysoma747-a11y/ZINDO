import type { Role } from "@prisma/client";

// Catalogue des permissions disponibles dans ZINDO.
export const PERMISSIONS = {
  PRODUCTS_VIEW: "produits.consulter",
  PRODUCTS_MANAGE: "produits.gerer",
  CATEGORIES_MANAGE: "categories.gerer",
  STOCK_VIEW: "stock.consulter",
  STOCK_MANAGE: "stock.gerer",
  SALES_CREATE: "ventes.creer",
  SALES_VIEW: "ventes.consulter",
  /** Supprimer définitivement une vente déjà annulée (flag alerte_vente_annulee) — Administrateur seulement par défaut. */
  SALES_DELETE: "ventes.supprimer",
  CUSTOMERS_VIEW: "clients.consulter",
  CUSTOMERS_MANAGE: "clients.gerer",
  SUPPLIERS_MANAGE: "fournisseurs.gerer",
  PURCHASES_MANAGE: "achats.gerer",
  INVENTORY_MANAGE: "inventaire.gerer",
  REPORTS_VIEW: "rapports.consulter",
  USERS_MANAGE: "utilisateurs.gerer",
  SETTINGS_MANAGE: "parametres.gerer",
  LOCATIONS_MANAGE: "boutiques.gerer",
  TRANSFERS_MANAGE: "transferts.gerer",
  ASSISTANT_USE: "assistant.utiliser",
  EXPENSES_MANAGE: "depenses.gerer",
  CASH_SESSIONS_MANAGE: "caisse.gerer",
  /** "Caisse à deux" (lib/business-settings.ts `modulesEnabled.cashierQueue`) : récupérer un panier de la file d'attente et finaliser le paiement — distinct de SALES_CREATE (préparer/envoyer un panier). */
  CASHIER_QUEUE_MANAGE: "caisse.encaisser",
  PICKUPS_MANAGE: "enlevements.gerer",
  SHIPMENTS_MANAGE: "expeditions.gerer",
  QUICK_SUPPLY_MANAGE: "appro_rapide.gerer",
  /** Prix de revient : arrivages, frais d'approche, application des prix au catalogue (propriétaire par défaut, accordable). */
  COST_PRICE_MANAGE: "prix_revient.gerer",
  CONSULTATIONS_MANAGE: "consultations.gerer",
  EXPIRY_MANAGE: "peremption.gerer",
  REPAIRS_MANAGE: "reparations.gerer",
  TABLES_MANAGE: "tables.gerer",
  CUSTOM_ORDERS_MANAGE: "commandes_sur_mesure.gerer",
  WARRANTY_MANAGE: "garantie.gerer",
  APPOINTMENTS_MANAGE: "rendez_vous.gerer",
  SCHOOL_MANAGE: "ecole.gerer",
  /** Espace enseignant : appel, notes, emploi du temps, leçons et devoirs de SES classes (fiche enseignant reliée au compte). */
  SCHOOL_TEACH: "ecole.enseigner",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Matrice de permissions par défaut (section 22 du cahier des charges).
// Personnalisable ensuite par commerce via la table RolePermission.
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: Object.values(PERMISSIONS),
  VENDEUR: [
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.STOCK_VIEW,
    PERMISSIONS.SALES_CREATE,
    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_MANAGE,
    PERMISSIONS.CASH_SESSIONS_MANAGE,
    // Pas de CASHIER_QUEUE_MANAGE par défaut : le commerçant l'accorde
    // explicitement à qui doit encaisser depuis la file d'attente, une fois
    // "Caisse à deux" activé — voir Paramètres > Modules > Rôles et permissions.
    PERMISSIONS.SHIPMENTS_MANAGE,
    PERMISSIONS.TABLES_MANAGE,
    PERMISSIONS.WARRANTY_MANAGE,
    PERMISSIONS.APPOINTMENTS_MANAGE,
  ],
  GESTIONNAIRE_STOCK: [
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_MANAGE,
    PERMISSIONS.CATEGORIES_MANAGE,
    PERMISSIONS.STOCK_VIEW,
    PERMISSIONS.STOCK_MANAGE,
    PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.SUPPLIERS_MANAGE,
    PERMISSIONS.PURCHASES_MANAGE,
    PERMISSIONS.TRANSFERS_MANAGE,
    PERMISSIONS.PICKUPS_MANAGE,
    PERMISSIONS.QUICK_SUPPLY_MANAGE,
    PERMISSIONS.EXPIRY_MANAGE,
    PERMISSIONS.REPAIRS_MANAGE,
    PERMISSIONS.CUSTOM_ORDERS_MANAGE,
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrateur",
  VENDEUR: "Vendeur",
  GESTIONNAIRE_STOCK: "Gestionnaire de stock",
};

/** Noms des rôles dans une école : mêmes rôles techniques, mots de l'école. */
export const SCHOOL_ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Directeur (administrateur)",
  VENDEUR: "Secrétariat / caisse",
  GESTIONNAIRE_STOCK: "Enseignant",
};

/** Libellés des rôles selon l'activité (« ecole » : Directeur, Secrétariat, Enseignant). */
export function roleLabels(activityKey?: string | null): Record<Role, string> {
  return activityKey === "ecole" ? SCHOOL_ROLE_LABELS : ROLE_LABELS;
}

/** Seuls droits qui ont un sens pour une école (le reste concerne caisse, stock, produits). */
export const SCHOOL_PERMISSION_KEYS: string[] = [
  PERMISSIONS.SCHOOL_MANAGE,
  PERMISSIONS.SCHOOL_TEACH,
  PERMISSIONS.EXPENSES_MANAGE,
  PERMISSIONS.REPORTS_VIEW,
  PERMISSIONS.ASSISTANT_USE,
  PERMISSIONS.USERS_MANAGE,
  PERMISSIONS.SETTINGS_MANAGE,
];

export const PERMISSION_LABELS: Record<string, string> = {
  [PERMISSIONS.PRODUCTS_VIEW]: "Consulter les produits",
  [PERMISSIONS.PRODUCTS_MANAGE]: "Gérer les produits",
  [PERMISSIONS.CATEGORIES_MANAGE]: "Gérer les catégories",
  [PERMISSIONS.STOCK_VIEW]: "Consulter le stock",
  [PERMISSIONS.STOCK_MANAGE]: "Gérer le stock (entrées/sorties)",
  [PERMISSIONS.SALES_CREATE]: "Effectuer des ventes",
  [PERMISSIONS.SALES_VIEW]: "Consulter les ventes",
  [PERMISSIONS.SALES_DELETE]: "Supprimer une vente annulée",
  [PERMISSIONS.CUSTOMERS_VIEW]: "Consulter les clients",
  [PERMISSIONS.CUSTOMERS_MANAGE]: "Gérer les clients",
  [PERMISSIONS.SUPPLIERS_MANAGE]: "Gérer les fournisseurs",
  [PERMISSIONS.PURCHASES_MANAGE]: "Gérer les achats",
  [PERMISSIONS.INVENTORY_MANAGE]: "Faire l'inventaire",
  [PERMISSIONS.REPORTS_VIEW]: "Consulter les rapports",
  [PERMISSIONS.USERS_MANAGE]: "Gérer les utilisateurs",
  [PERMISSIONS.SETTINGS_MANAGE]: "Gérer les paramètres",
  [PERMISSIONS.LOCATIONS_MANAGE]: "Gérer les boutiques et dépôts",
  [PERMISSIONS.TRANSFERS_MANAGE]: "Effectuer des transferts de stock",
  [PERMISSIONS.ASSISTANT_USE]: "Utiliser l'assistant IA",
  [PERMISSIONS.EXPENSES_MANAGE]: "Gérer les dépenses",
  [PERMISSIONS.CASH_SESSIONS_MANAGE]: "Ouvrir / fermer la caisse",
  [PERMISSIONS.CASHIER_QUEUE_MANAGE]: "Encaisser depuis la file d'attente (Caisse à deux)",
  [PERMISSIONS.PICKUPS_MANAGE]: "Gérer les enlèvements partenaires",
  [PERMISSIONS.SHIPMENTS_MANAGE]: "Gérer les expéditions",
  [PERMISSIONS.QUICK_SUPPLY_MANAGE]: "Utiliser l'approvisionnement rapide",
  [PERMISSIONS.COST_PRICE_MANAGE]: "Gérer le prix de revient (arrivages et prix)",
  [PERMISSIONS.CONSULTATIONS_MANAGE]: "Gérer les consultations (cabinet médical)",
  [PERMISSIONS.EXPIRY_MANAGE]: "Gérer le suivi des dates de péremption (supermarché / pharmacie)",
  [PERMISSIONS.REPAIRS_MANAGE]: "Gérer les bons de réparation (atelier / pièces détachées)",
  [PERMISSIONS.TABLES_MANAGE]: "Gérer les tables (restaurant / bar)",
  [PERMISSIONS.CUSTOM_ORDERS_MANAGE]: "Gérer les commandes sur mesure (atelier artisanal)",
  [PERMISSIONS.WARRANTY_MANAGE]: "Gérer les garanties produits (électronique / téléphonie)",
  [PERMISSIONS.APPOINTMENTS_MANAGE]: "Gérer les rendez-vous (cosmétique / beauté)",
  [PERMISSIONS.SCHOOL_MANAGE]: "Diriger l'école : élèves, classes, scolarité, enseignants, bulletins",
  [PERMISSIONS.SCHOOL_TEACH]: "Enseigner : appel, notes, leçons et devoirs de ses classes (école)",
};
