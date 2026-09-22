import { PERMISSIONS, type Permission } from "@/lib/permissions";
import { MOTO_ACTIVITY_KEY } from "@/lib/activities";

export const MEDICAL_ACTIVITY_KEY = "cabinet_medical";
export const CONSULTATIONS_FLAG = "consultations_cabinet_medical";
export const SUPERMARKET_ACTIVITY_KEY = "supermarche_alimentation";
export const PHARMACY_ACTIVITY_KEY = "pharmacie";
export const EXPIRY_FLAG = "peremption_dlc";
/** Activités concernées par le suivi des dates de péremption (DLC) — voir requireActivity sur l'entrée "Péremption (DLC)" ci-dessous. */
export const EXPIRY_ACTIVITIES = [SUPERMARKET_ACTIVITY_KEY, PHARMACY_ACTIVITY_KEY];

export const REPAIR_ACTIVITY_KEY = "atelier_reparation";
export const SPARE_PARTS_ACTIVITY_KEY = "pieces_detachees";
export const REPAIR_FLAG = "bons_reparation";
/** Activités concernées par les bons de réparation — voir requireActivity sur l'entrée "Bons de réparation" ci-dessous. */
export const REPAIR_ACTIVITIES = [REPAIR_ACTIVITY_KEY, SPARE_PARTS_ACTIVITY_KEY];

export const RESTAURANT_ACTIVITY_KEY = "restaurant_maquis";
export const BAR_ACTIVITY_KEY = "bar_buvette";
export const TABLES_FLAG = "gestion_tables";
/** Activités concernées par la gestion des tables (comptes ouverts en salle) — voir requireActivity sur l'entrée "Tables" ci-dessous. */
export const TABLE_ACTIVITIES = [RESTAURANT_ACTIVITY_KEY, BAR_ACTIVITY_KEY];

export type NavItem = {
  label: string;
  href: string;
  icon:
    | "dashboard"
    | "sales"
    | "products"
    | "categories"
    | "brands"
    | "stock"
    | "purchases"
    | "customers"
    | "credits"
    | "suppliers"
    | "inventory"
    | "history"
    | "history-global"
    | "reports"
    | "users"
    | "settings"
    | "locations"
    | "transfers"
    | "assistant"
    | "expenses"
    | "cash-sessions"
    | "invoices"
    | "support"
    | "online-store"
    | "vehicle-sales"
    | "quotes"
    | "vehicle-registration"
    | "subscription"
    | "notifications"
    | "credit-reminders"
    | "restock"
    | "cost-price"
    | "product-photos"
    | "rentals"
    | "quick-supply"
    | "pickups"
    | "shipments"
    | "cashier"
    | "consultations"
    | "medical-acts"
    | "diagnostics"
    | "posologies"
    | "medical-stats"
    | "expiry"
    | "repairs"
    | "tables";
  permission?: Permission;
  featureFlag?: string;
  planFeature?: string;
  badge?: string;
  /** Module que le commerçant peut lui-même masquer depuis Paramètres (lib/business-settings.ts `modulesEnabled`). */
  moduleToggle?:
    | "devis"
    | "prixDeRevient"
    | "photosProduits"
    | "rappelsCredit"
    | "reassort"
    | "notifications"
    | "quickSupply"
    | "pickups"
    | "shipments"
    | "cashierQueue";
  /** N'apparaît que pour ce(s) type(s) d'activité précis (lib/activities.ts) — un tableau si plusieurs activités sont concernées. Voir lib/nav-server.ts. */
  requireActivity?: string | string[];
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Tableau de bord", href: "/dashboard", icon: "dashboard" },
  { label: "Notifications", href: "/notifications", icon: "notifications", permission: PERMISSIONS.STOCK_VIEW, moduleToggle: "notifications" },
  { label: "Assistant IA", href: "/assistant", icon: "assistant", permission: PERMISSIONS.ASSISTANT_USE, planFeature: "assistant_ia", badge: "IA" },
  { label: "Vente", href: "/ventes", icon: "sales", permission: PERMISSIONS.SALES_CREATE },
  {
    label: "Caisse",
    href: "/caisse",
    icon: "cashier",
    permission: PERMISSIONS.CASHIER_QUEUE_MANAGE,
    moduleToggle: "cashierQueue",
  },
  {
    label: "Vente Engin",
    href: "/vente-engin",
    icon: "vehicle-sales",
    permission: PERMISSIONS.SALES_CREATE,
    requireActivity: MOTO_ACTIVITY_KEY,
  },
  {
    label: "Immatriculation Engins",
    href: "/immatriculation-engins",
    icon: "vehicle-registration",
    permission: PERMISSIONS.SALES_VIEW,
    requireActivity: MOTO_ACTIVITY_KEY,
  },
  {
    label: "Consultations",
    href: "/consultations",
    icon: "consultations",
    permission: PERMISSIONS.CONSULTATIONS_MANAGE,
    requireActivity: MEDICAL_ACTIVITY_KEY,
    featureFlag: CONSULTATIONS_FLAG,
  },
  {
    label: "Statistiques médicales",
    href: "/consultations/statistiques",
    icon: "medical-stats",
    permission: PERMISSIONS.CONSULTATIONS_MANAGE,
    requireActivity: MEDICAL_ACTIVITY_KEY,
    featureFlag: CONSULTATIONS_FLAG,
  },
  {
    label: "Actes médicaux",
    href: "/consultations/actes",
    icon: "medical-acts",
    permission: PERMISSIONS.CONSULTATIONS_MANAGE,
    requireActivity: MEDICAL_ACTIVITY_KEY,
    featureFlag: CONSULTATIONS_FLAG,
  },
  {
    label: "Diagnostics",
    href: "/consultations/diagnostics",
    icon: "diagnostics",
    permission: PERMISSIONS.CONSULTATIONS_MANAGE,
    requireActivity: MEDICAL_ACTIVITY_KEY,
    featureFlag: CONSULTATIONS_FLAG,
  },
  {
    label: "Posologies",
    href: "/consultations/posologies",
    icon: "posologies",
    permission: PERMISSIONS.CONSULTATIONS_MANAGE,
    requireActivity: MEDICAL_ACTIVITY_KEY,
    featureFlag: CONSULTATIONS_FLAG,
  },
  { label: "Facture A4", href: "/factures", icon: "invoices", permission: PERMISSIONS.SALES_CREATE },
  { label: "Devis", href: "/devis", icon: "quotes", permission: PERMISSIONS.SALES_CREATE, featureFlag: "devis", moduleToggle: "devis" },
  { label: "Location", href: "/location", icon: "rentals", permission: PERMISSIONS.SALES_VIEW },
  { label: "Historique des ventes", href: "/ventes/historique", icon: "history", permission: PERMISSIONS.SALES_VIEW },
  { label: "Sessions de caisse", href: "/ventes/sessions", icon: "cash-sessions", permission: PERMISSIONS.CASH_SESSIONS_MANAGE },
  { label: "Produits", href: "/produits", icon: "products", permission: PERMISSIONS.PRODUCTS_VIEW },
  { label: "Prix de revient", href: "/prix-de-revient", icon: "cost-price", permission: PERMISSIONS.PRODUCTS_MANAGE, moduleToggle: "prixDeRevient" },
  { label: "Photos produits", href: "/photos-produits", icon: "product-photos", permission: PERMISSIONS.PRODUCTS_MANAGE, moduleToggle: "photosProduits" },
  { label: "Catégories", href: "/categories", icon: "categories", permission: PERMISSIONS.CATEGORIES_MANAGE },
  { label: "Marques", href: "/marques", icon: "brands", permission: PERMISSIONS.CATEGORIES_MANAGE },
  { label: "Stock", href: "/stock", icon: "stock", permission: PERMISSIONS.STOCK_VIEW },
  { label: "Réassort", href: "/reassort", icon: "restock", permission: PERMISSIONS.STOCK_VIEW, moduleToggle: "reassort" },
  {
    label: "Péremption (DLC)",
    href: "/peremption",
    icon: "expiry",
    permission: PERMISSIONS.EXPIRY_MANAGE,
    requireActivity: EXPIRY_ACTIVITIES,
    featureFlag: EXPIRY_FLAG,
  },
  {
    label: "Bons de réparation",
    href: "/reparations",
    icon: "repairs",
    permission: PERMISSIONS.REPAIRS_MANAGE,
    requireActivity: REPAIR_ACTIVITIES,
    featureFlag: REPAIR_FLAG,
  },
  {
    label: "Tables",
    href: "/tables",
    icon: "tables",
    permission: PERMISSIONS.TABLES_MANAGE,
    requireActivity: TABLE_ACTIVITIES,
    featureFlag: TABLES_FLAG,
  },
  { label: "Transferts", href: "/transferts", icon: "transfers", permission: PERMISSIONS.TRANSFERS_MANAGE, planFeature: "advanced_stock" },
  { label: "Approvisionnement rapide", href: "/approvisionnement", icon: "quick-supply", permission: PERMISSIONS.STOCK_MANAGE, moduleToggle: "quickSupply" },
  { label: "Enlèvements partenaires", href: "/enlevements", icon: "pickups", permission: PERMISSIONS.STOCK_MANAGE, moduleToggle: "pickups" },
  { label: "Expéditions", href: "/expeditions", icon: "shipments", permission: PERMISSIONS.SALES_VIEW, moduleToggle: "shipments" },
  { label: "Achats", href: "/achats", icon: "purchases", permission: PERMISSIONS.PURCHASES_MANAGE },
  { label: "Dépenses", href: "/depenses", icon: "expenses", permission: PERMISSIONS.EXPENSES_MANAGE, planFeature: "expenses" },
  { label: "Clients", href: "/clients", icon: "customers", permission: PERMISSIONS.CUSTOMERS_VIEW },
  { label: "Crédits", href: "/credits", icon: "credits", permission: PERMISSIONS.CUSTOMERS_VIEW, planFeature: "credits" },
  { label: "Rappels crédit", href: "/rappels-credit", icon: "credit-reminders", permission: PERMISSIONS.CUSTOMERS_VIEW, planFeature: "credits", moduleToggle: "rappelsCredit" },
  { label: "Fournisseurs", href: "/fournisseurs", icon: "suppliers", permission: PERMISSIONS.SUPPLIERS_MANAGE },
  { label: "Inventaire", href: "/inventaire", icon: "inventory", permission: PERMISSIONS.INVENTORY_MANAGE, planFeature: "inventory" },
  { label: "Historique global", href: "/historique", icon: "history-global", permission: PERMISSIONS.REPORTS_VIEW, planFeature: "advanced_reports" },
  { label: "Rapports", href: "/rapports", icon: "reports", permission: PERMISSIONS.REPORTS_VIEW },
  { label: "Boutiques", href: "/boutiques", icon: "locations", permission: PERMISSIONS.LOCATIONS_MANAGE },
  {
    label: "Boutique en ligne",
    href: "/boutique-en-ligne",
    icon: "online-store",
    permission: PERMISSIONS.SETTINGS_MANAGE,
    featureFlag: "boutique_en_ligne",
    planFeature: "boutique_en_ligne",
  },
  { label: "Utilisateurs", href: "/utilisateurs", icon: "users", permission: PERMISSIONS.USERS_MANAGE },
  { label: "Aide & support", href: "/support", icon: "support" },
  { label: "Paramètres", href: "/parametres", icon: "settings", permission: PERMISSIONS.SETTINGS_MANAGE },
  // Pas de `permission` : accessible à tous les rôles, y compris pendant un
  // blocage pour essai expiré (voir requireUser()/isSubscriptionBlocked).
  { label: "Abonnement", href: "/abonnement", icon: "subscription" },
];
