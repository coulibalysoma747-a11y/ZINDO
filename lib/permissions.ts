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
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrateur",
  VENDEUR: "Vendeur",
  GESTIONNAIRE_STOCK: "Gestionnaire de stock",
};

export const PERMISSION_LABELS: Record<string, string> = {
  [PERMISSIONS.PRODUCTS_VIEW]: "Consulter les produits",
  [PERMISSIONS.PRODUCTS_MANAGE]: "Gérer les produits",
  [PERMISSIONS.CATEGORIES_MANAGE]: "Gérer les catégories",
  [PERMISSIONS.STOCK_VIEW]: "Consulter le stock",
  [PERMISSIONS.STOCK_MANAGE]: "Gérer le stock (entrées/sorties)",
  [PERMISSIONS.SALES_CREATE]: "Effectuer des ventes",
  [PERMISSIONS.SALES_VIEW]: "Consulter les ventes",
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
};
