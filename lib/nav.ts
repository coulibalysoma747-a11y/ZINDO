import { PERMISSIONS, type Permission } from "@/lib/permissions";

export type NavItem = {
  label: string;
  href: string;
  icon:
    | "dashboard"
    | "sales"
    | "products"
    | "categories"
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
    | "subscription";
  permission?: Permission;
  featureFlag?: string;
  planFeature?: string;
  badge?: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Tableau de bord", href: "/dashboard", icon: "dashboard" },
  { label: "Assistant IA", href: "/assistant", icon: "assistant", permission: PERMISSIONS.ASSISTANT_USE, planFeature: "assistant_ia", badge: "IA" },
  { label: "Vente / Caisse", href: "/ventes", icon: "sales", permission: PERMISSIONS.SALES_CREATE },
  { label: "Facture A4", href: "/factures", icon: "invoices", permission: PERMISSIONS.SALES_CREATE },
  { label: "Historique des ventes", href: "/ventes/historique", icon: "history", permission: PERMISSIONS.SALES_VIEW },
  { label: "Sessions de caisse", href: "/ventes/sessions", icon: "cash-sessions", permission: PERMISSIONS.CASH_SESSIONS_MANAGE },
  { label: "Produits", href: "/produits", icon: "products", permission: PERMISSIONS.PRODUCTS_VIEW },
  { label: "Catégories", href: "/categories", icon: "categories", permission: PERMISSIONS.CATEGORIES_MANAGE },
  { label: "Stock", href: "/stock", icon: "stock", permission: PERMISSIONS.STOCK_VIEW },
  { label: "Transferts", href: "/transferts", icon: "transfers", permission: PERMISSIONS.TRANSFERS_MANAGE, planFeature: "advanced_stock" },
  { label: "Achats", href: "/achats", icon: "purchases", permission: PERMISSIONS.PURCHASES_MANAGE },
  { label: "Dépenses", href: "/depenses", icon: "expenses", permission: PERMISSIONS.EXPENSES_MANAGE, planFeature: "expenses" },
  { label: "Clients", href: "/clients", icon: "customers", permission: PERMISSIONS.CUSTOMERS_VIEW },
  { label: "Crédits", href: "/credits", icon: "credits", permission: PERMISSIONS.CUSTOMERS_VIEW, planFeature: "credits" },
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
  { label: "Abonnement", href: "/abonnement", icon: "subscription", permission: PERMISSIONS.SETTINGS_MANAGE },
  { label: "Aide & support", href: "/support", icon: "support" },
  { label: "Paramètres", href: "/parametres", icon: "settings", permission: PERMISSIONS.SETTINGS_MANAGE },
];
