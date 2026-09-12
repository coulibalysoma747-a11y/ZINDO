// Types et constantes partagés entre code serveur et composants client pour
// la personnalisation de l'interface par activité. Ce fichier ne doit jamais
// importer prisma ni "server-only" — voir lib/activity-config.ts pour l'accès
// aux données (lecture en base), réservé au serveur.

export type TermKey = "products" | "clients" | "suppliers" | "sales" | "purchases" | "stock" | "credits";

export const TERM_DEFAULTS: Record<TermKey, string> = {
  products: "Produits",
  clients: "Clients",
  suppliers: "Fournisseurs",
  sales: "Vente / Caisse",
  purchases: "Achats",
  stock: "Stock",
  credits: "Crédits",
};

// Associe chaque terme personnalisable au lien de menu qu'il contrôle.
export const TERM_NAV_HREF: Record<TermKey, string> = {
  products: "/produits",
  clients: "/clients",
  suppliers: "/fournisseurs",
  sales: "/ventes",
  purchases: "/achats",
  stock: "/stock",
  credits: "/credits",
};

export type CustomFieldType = "text" | "number" | "date";

export type CustomFieldDef = {
  key: string;
  label: string;
  type: CustomFieldType;
};

export type ActivityConfigData = {
  terminology: Partial<Record<TermKey, string>>;
  hiddenNavHrefs: string[];
  defaultCategories: string[];
  customFields: CustomFieldDef[];
};

export function resolveTerm(config: ActivityConfigData, term: TermKey): string {
  return config.terminology[term]?.trim() || TERM_DEFAULTS[term];
}
