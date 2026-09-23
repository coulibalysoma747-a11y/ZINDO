-- Pack Vérifié du Marché ZINDO (1 000 FCFA / mois, séparé de l'abonnement) :
-- badge « Vérifié » + mise « À la une » tant que pack_paid_until est dans le
-- futur. Le paiement se fait par Mobile Money puis l'admin confirme la
-- référence depuis /admin/verifications (première demande ou renouvellement).
--
-- Additif et idempotent. À exécuter APRÈS 2026-09-23_market_verifications.sql.

alter table market_verifications add column if not exists payment_reference text;
alter table market_verifications add column if not exists pack_paid_until timestamptz;
alter table market_verifications add column if not exists renewal_reference text;
alter table market_verifications add column if not exists renewal_submitted_at timestamptz;

-- Vendeur du Marché sans boutique (inscription /marche/vendre) : n'a accès
-- qu'à l'espace vendeur simplifié, jamais à l'application complète.
alter table businesses add column if not exists market_seller boolean not null default false;
