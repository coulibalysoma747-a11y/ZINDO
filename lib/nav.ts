import { PERMISSIONS, type Permission } from "@/lib/permissions";
import { MOTO_ACTIVITY_KEY } from "@/lib/activities";

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
    | "rentals";
  permission?: Permission;
  featureFlag?: string;
  planFeature?: string;
  badge?: string;
  /** N'apparaît que pour ce type d'activité précis (lib/activities.ts) — voir lib/nav-server.ts. */
  requireActivity?: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Tableau de bord", href: "/dashboard", icon: "dashboard" },
  { label: "Notifications", href: "/notifications", icon: "notifications", permission: PERMISSIONS.STOCK_VIEW },
  { label: "Assistant IA", href: "/assistant", icon: "assistant", permission: PERMISSIONS.ASSISTANT_USE, planFeature: "assistant_ia", badge: "IA" },
  { label: "Vente / Caisse", href: "/ventes", icon: "sales", permission: PERMISSIONS.SALES_CREATE },
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
  { label: "Facture A4", href: "/factures", icon: "invoices", permission: PERMISSIONS.SALES_CREATE },
  { label: "Devis", href: "/devis", icon: "quotes", permission: PERMISSIONS.SALES_CREATE, featureFlag: "devis" },
  { label: "Location", href: "/location", icon: "rentals", permission: PERMISSIONS.SALES_VIEW },
  { label: "Historique des ventes", href: "/ventes/historique", icon: "history", permission: PERMISSIONS.SALES_VIEW },
  { label: "Sessions de caisse", href: "/ventes/sessions", icon: "cash-sessions", permission: PERMISSIONS.CASH_SESSIONS_MANAGE },
  { label: "Produits", href: "/produits", icon: "products", permission: PERMISSIONS.PRODUCTS_VIEW },
  { label: "Prix de revient", href: "/prix-de-revient", icon: "cost-price", permission: PERMISSIONS.PRODUCTS_MANAGE },
  { label: "Photos produits", href: "/photos-produits", icon: "product-photos", permission: PERMISSIONS.PRODUCTS_MANAGE },
  { label: "Catégories", href: "/categories", icon: "categories", permission: PERMISSIONS.CATEGORIES_MANAGE },
  { label: "Marques", href: "/marques", icon: "brands", permission: PERMISSIONS.CATEGORIES_MANAGE },
  { label: "Stock", href: "/stock", icon: "stock", permission: PERMISSIONS.STOCK_VIEW },
  { label: "Réassort", href: "/reassort", icon: "restock", permission: PERMISSIONS.STOCK_VIEW },
  { label: "Transferts", href: "/transferts", icon: "transfers", permission: PERMISSIONS.TRANSFERS_MANAGE, planFeature: "advanced_stock" },
  { label: "Achats", href: "/achats", icon: "purchases", permission: PERMISSIONS.PURCHASES_MANAGE },
  { label: "Dépenses", href: "/depenses", icon: "expenses", permission: PERMISSIONS.EXPENSES_MANAGE, planFeature: "expenses" },
  { label: "Clients", href: "/clients", icon: "customers", permission: PERMISSIONS.CUSTOMERS_VIEW },
  { label: "Crédits", href: "/credits", icon: "credits", permission: PERMISSIONS.CUSTOMERS_VIEW, planFeature: "credits" },
  { label: "Rappels crédit", href: "/rappels-credit", icon: "credit-reminders", permission: PERMISSIONS.CUSTOMERS_VIEW, planFeature: "credits" },
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
