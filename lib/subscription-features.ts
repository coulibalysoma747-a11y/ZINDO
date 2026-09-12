// Catalogue de fonctionnalités affichées sur la grille tarifaire — partagé
// entre code serveur et composants client (aucun import prisma/server-only
// ici, voir lib/subscription.ts pour l'accès aux données côté serveur).
// Seules celles marquées `enforced: true` sont réellement contrôlées dans le
// code (module masqué du menu si absent du palier) — les autres sont pour
// l'instant purement informatives (aucun module correspondant n'existe
// encore, ou la distinction basique/avancée n'est pas encore modélisée).
export const FEATURE_CATALOG: { key: string; label: string; enforced: boolean }[] = [
  { key: "stock", label: "Stock", enforced: false },
  { key: "pos", label: "Vente / caisse", enforced: false },
  { key: "clients", label: "Clients", enforced: false },
  { key: "suppliers", label: "Fournisseurs", enforced: false },
  { key: "tickets", label: "Tickets", enforced: false },
  { key: "basic_reports", label: "Rapports de base", enforced: false },
  { key: "advanced_stock", label: "Gestion avancée du stock (transferts)", enforced: true },
  { key: "inventory", label: "Inventaire", enforced: true },
  { key: "expenses", label: "Dépenses", enforced: true },
  { key: "credits", label: "Crédits", enforced: true },
  { key: "promotions", label: "Promotions", enforced: false },
  { key: "advanced_reports", label: "Rapports avancés (historique global)", enforced: true },
  { key: "auto_backup", label: "Sauvegarde automatique", enforced: false },
  { key: "advanced_stats", label: "Statistiques avancées", enforced: false },
  { key: "assistant_ia", label: "Assistant IA", enforced: true },
  { key: "boutique_en_ligne", label: "Catalogue + commandes en ligne", enforced: true },
  { key: "deliveries", label: "Gestion des livraisons", enforced: false },
  { key: "smart_analysis", label: "Analyse intelligente", enforced: false },
  { key: "advanced_backups", label: "Sauvegardes avancées", enforced: false },
  { key: "priority_support_active", label: "Support actif (fonctionnalités futures incluses)", enforced: false },
  { key: "advanced_permissions", label: "Gestion avancée des permissions", enforced: false },
  { key: "centralized_control", label: "Contrôle centralisé", enforced: false },
  { key: "consolidated_reports", label: "Rapports consolidés", enforced: false },
  { key: "api_access", label: "API / intégrations", enforced: false },
  { key: "priority_support", label: "Support prioritaire", enforced: false },
];
