-- Payeur d'une facture d'abonnement : saisi par l'admin au moment où il
-- confirme le paiement (nom, prénom, numéro du Mobile Money qui a payé),
-- puis affiché sur la facture du commerçant.
--
-- Additif et idempotent.

alter table subscription_invoices add column if not exists payer_last_name text;
alter table subscription_invoices add column if not exists payer_first_name text;
alter table subscription_invoices add column if not exists payer_phone text;
