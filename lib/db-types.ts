// Types partagés remplaçant les imports `import type { X } from "@prisma/client"`
// désormais que l'application interroge Supabase directement (plus de client
// Prisma généré). Doivent rester synchronisés avec les `create type ... as enum`
// de supabase/schema.sql.

export type LocationType = "BOUTIQUE" | "DEPOT";
export type Role = "ADMIN" | "VENDEUR" | "GESTIONNAIRE_STOCK";
export type MovementDirection = "IN" | "OUT";
export type MovementReason =
  | "ACHAT"
  | "RETOUR_CLIENT"
  | "CORRECTION"
  | "INVENTAIRE"
  | "VENTE"
  | "PRODUIT_ENDOMMAGE"
  | "PERTE"
  | "RETOUR_FOURNISSEUR"
  | "TRANSFERT"
  | "AUTRE"
  | "ENLEVEMENT";
export type PaymentMethod = "ESPECES" | "MOBILE_MONEY" | "CARTE" | "CREDIT" | "AUTRE" | "MIXTE";
export type SaleStatus = "PAYEE" | "PARTIELLE" | "CREDIT" | "ANNULEE";
export type CashSessionStatus = "OUVERTE" | "FERMEE";
export type PurchaseStatus = "RECUE" | "PARTIELLE" | "COMMANDEE";
export type InventoryStatus = "EN_COURS" | "VALIDE";
export type NotificationType =
  | "STOCK_FAIBLE"
  | "RUPTURE_STOCK"
  | "INVENTAIRE_NECESSAIRE"
  | "CREDIT_ECHU"
  | "INFO";
export type SuperAdminRole = "FOUNDER" | "ADMIN";
export type SupportTicketStatus = "OUVERT" | "EN_COURS" | "RESOLU";
export type OnlineOrderStatus = "EN_ATTENTE" | "CONFIRMEE" | "PRETE" | "LIVREE" | "ANNULEE";
export type BillingCycle = "MONTHLY" | "ANNUAL";
export type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "TRIAL" | "EXPIRED";
export type RentalStatus = "EN_COURS" | "RETOURNEE" | "ANNULEE";
export type InvoiceStatus = "EN_ATTENTE" | "PAYEE" | "ANNULEE";
export type InvoicePaymentMethod = "MANUEL" | "CINETPAY";
