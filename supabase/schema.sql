-- ZINDO — schéma complet Postgres pour Supabase
-- À exécuter une fois dans Supabase → SQL Editor → New query → Run.
-- Les identifiants utilisent gen_random_uuid() (extension pgcrypto, activée
-- par défaut sur Supabase) au lieu des cuid() générés côté application par
-- l'ancien client Prisma.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type location_type as enum ('BOUTIQUE', 'DEPOT');
create type role as enum ('ADMIN', 'VENDEUR', 'GESTIONNAIRE_STOCK');
create type movement_direction as enum ('IN', 'OUT');
create type movement_reason as enum ('ACHAT','RETOUR_CLIENT','CORRECTION','INVENTAIRE','VENTE','PRODUIT_ENDOMMAGE','PERTE','RETOUR_FOURNISSEUR','TRANSFERT','AUTRE');
create type payment_method as enum ('ESPECES','MOBILE_MONEY','CARTE','CREDIT','AUTRE');
create type sale_status as enum ('PAYEE','PARTIELLE','CREDIT','ANNULEE');
create type cash_session_status as enum ('OUVERTE','FERMEE');
create type purchase_status as enum ('RECUE','PARTIELLE','COMMANDEE');
create type inventory_status as enum ('EN_COURS','VALIDE');
create type notification_type as enum ('STOCK_FAIBLE','RUPTURE_STOCK','INVENTAIRE_NECESSAIRE','CREDIT_ECHU','INFO');
create type super_admin_role as enum ('FOUNDER','ADMIN');
create type support_ticket_status as enum ('OUVERT','EN_COURS','RESOLU');
create type online_order_status as enum ('EN_ATTENTE','CONFIRMEE','LIVREE','ANNULEE');
create type billing_cycle as enum ('MONTHLY','ANNUAL');
create type subscription_status as enum ('ACTIVE','PAST_DUE');
create type invoice_status as enum ('EN_ATTENTE','PAYEE','ANNULEE');
create type invoice_payment_method as enum ('MANUEL','CINETPAY');
create type quote_status as enum ('BROUILLON','ENVOYE','ACCEPTE','REFUSE','EXPIRE','CONVERTI');

-- ---------------------------------------------------------------------------
-- Commerce / compte
-- ---------------------------------------------------------------------------
create table businesses (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  activity text,
  activity_key text,
  logo_url text,
  phone text,
  email text,
  address text,
  city text,
  country text not null default 'Burkina Faso',
  currency text not null default 'XOF',
  ticket_width text not null default '80mm',
  ticket_footer text not null default 'Merci pour votre visite.',
  qr_code_size int not null default 0,
  default_min_stock int not null default 5,
  plan text not null default 'FREE',
  suspended boolean not null default false,
  next_product_seq int not null default 1,
  next_sale_seq int not null default 1,
  next_purchase_seq int not null default 1,
  next_transfer_seq int not null default 1,
  next_session_seq int not null default 1,
  next_online_order_seq int not null default 1,
  next_invoice_seq int not null default 1,
  next_quote_seq int not null default 1,
  -- Intégration FasoStock (lib/integrations/faso-stock.ts) : synchronisation
  -- à sens unique FasoStock → ZINDO (leur API est en lecture seule). La clé
  -- n'est jamais renvoyée au navigateur, uniquement lue côté serveur.
  faso_stock_api_key text,
  faso_stock_store_mapping text,
  faso_stock_last_sync_at timestamptz,
  faso_stock_last_sync_status text,
  faso_stock_last_sync_error text,
  -- Personnalisation de la facture A4 (components/sales/Facture.tsx), au-delà
  -- des champs déjà génériques (nom, logo, adresse...) — voir /parametres.
  invoice_tagline text,
  mobile_money_info text,
  invoice_signer_name text,
  invoice_return_policy text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table locations (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  name text not null,
  type location_type not null default 'BOUTIQUE',
  address text,
  city text,
  is_default boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);
create index on locations (business_id);

create table users (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text,
  password_hash text not null,
  role role not null default 'VENDEUR',
  active boolean not null default true,
  theme text not null default 'SYSTEM',
  auto_print_receipt boolean not null default false,
  printer_ticket_width text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, phone)
);
create index on users (business_id);

create table role_permissions (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  role role not null,
  permission text not null,
  allowed boolean not null default true,
  unique (business_id, role, permission)
);
create index on role_permissions (business_id);

create table user_permissions (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references users(id) on delete cascade,
  permission text not null,
  allowed boolean not null default true,
  unique (user_id, permission)
);
create index on user_permissions (user_id);

-- Jetons de réinitialisation de mot de passe (lib/actions/password-reset.ts) :
-- seul le hash SHA-256 du jeton est stocké, jamais le jeton en clair (qui
-- n'existe que dans le lien envoyé par e-mail) — une fuite de cette table ne
-- permet donc pas de rejouer un lien de réinitialisation valide.
create table password_reset_tokens (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index on password_reset_tokens (user_id);

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
create table categories (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);
create index on categories (business_id);

create table suppliers (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  name text not null,
  company text,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);
create index on suppliers (business_id);

create table products (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  reference text not null,
  name text not null,
  category_id text references categories(id),
  brand text,
  description text,
  unit text not null default 'unité',
  purchase_price double precision not null default 0,
  sale_price double precision not null default 0,
  min_stock int not null default 5,
  shelf_location text,
  supplier_id text references suppliers(id),
  photo_url text,
  barcode text,
  custom_fields text,
  active boolean not null default true,
  -- Identifiant du produit côté FasoStock, pour retrouver un produit déjà
  -- synchronisé lors des synchronisations suivantes (mise à jour plutôt que
  -- doublon). NULL pour tout produit créé manuellement dans ZINDO — une
  -- contrainte unique standard (pas un index partiel) autorise plusieurs
  -- NULL sans conflit, tout en empêchant deux lignes du même commerce de
  -- pointer vers le même produit FasoStock.
  faso_stock_id text,
  -- Suivi individuel (moto/engin : chaque exemplaire a son propre châssis,
  -- moteur, couleur...) plutôt qu'une simple quantité en stock — voir la
  -- table vehicle_units. Le stock de ce produit reste product_stocks comme
  -- pour tous les autres (tenu à jour à chaque ajout/retrait/vente d'un
  -- exemplaire), pour que le reste de l'app (alertes, rapports, caisse) n'ait
  -- rien à connaître de cette distinction.
  track_units boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, reference),
  unique (business_id, faso_stock_id)
);
create index on products (business_id);
create index on products (business_id, barcode);
create index on products (business_id, name);

-- Exemplaires individuels d'un produit à suivi unitaire (motos/engins) : un
-- exemplaire = une ligne, avec son propre numéro de châssis (identifiant
-- réel du véhicule) et moteur. "EN_STOCK" tant qu'il n'a pas été vendu ;
-- passe à "VENDU" (avec sale_id renseigné) au moment de la vente — voir
-- lib/actions/vehicle-units.ts et la sélection d'exemplaire dans la caisse.
create table vehicle_units (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  product_id text not null references products(id) on delete cascade,
  location_id text not null references locations(id),
  chassis_number text not null,
  engine_number text,
  color text,
  cmc_available boolean not null default false,
  status text not null default 'EN_STOCK',
  sale_id text references sales(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, chassis_number)
);
create index on vehicle_units (business_id, product_id);
create index on vehicle_units (location_id, status);
create index on vehicle_units (sale_id);

create table product_stocks (
  id text primary key default gen_random_uuid()::text,
  product_id text not null references products(id) on delete cascade,
  location_id text not null references locations(id) on delete cascade,
  quantity int not null default 0,
  updated_at timestamptz not null default now(),
  unique (product_id, location_id)
);
create index on product_stocks (location_id);

-- ---------------------------------------------------------------------------
-- Mouvements de stock
-- ---------------------------------------------------------------------------
create table stock_movements (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  location_id text not null references locations(id),
  product_id text not null references products(id) on delete cascade,
  direction movement_direction not null,
  reason movement_reason not null,
  quantity int not null,
  old_stock int not null,
  new_stock int not null,
  note text,
  user_id text not null references users(id),
  created_at timestamptz not null default now()
);
create index on stock_movements (business_id, created_at);
create index on stock_movements (location_id);
create index on stock_movements (product_id);

-- ---------------------------------------------------------------------------
-- Ventes / caisse
-- ---------------------------------------------------------------------------
create table customers (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  credit_limit double precision not null default 0,
  created_at timestamptz not null default now()
);
create index on customers (business_id);

create table sales (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  location_id text not null references locations(id),
  number text not null,
  customer_id text references customers(id),
  user_id text not null references users(id),
  subtotal double precision not null,
  discount double precision not null default 0,
  total double precision not null,
  amount_paid double precision not null default 0,
  payment_method payment_method not null default 'ESPECES',
  status sale_status not null default 'PAYEE',
  document_type text not null default 'TICKET',
  note text,
  -- Référence générée côté client pour une vente créée hors ligne (voir
  -- lib/offline/), rejouée vers ce même endpoint dès le retour de la
  -- connexion. Permet de détecter un rejeu (retry réseau, double clic sur
  -- "Synchroniser") et de ne jamais créer deux fois la même vente. NULL pour
  -- toute vente créée normalement en ligne.
  client_ref text,
  created_at timestamptz not null default now(),
  unique (business_id, number),
  unique (business_id, client_ref)
);
create index on sales (business_id, created_at);
create index on sales (location_id);
create index on sales (customer_id);

create table sale_items (
  id text primary key default gen_random_uuid()::text,
  sale_id text not null references sales(id) on delete cascade,
  product_id text not null references products(id),
  quantity int not null,
  unit_price double precision not null,
  unit_cost double precision not null default 0,
  discount double precision not null default 0,
  total double precision not null
);
create index on sale_items (sale_id);
create index on sale_items (product_id);

-- Devis : proposition commerciale envoyée à un client avant la vente, sans
-- impact sur le stock. Convertible en vente réelle (table sales) une fois
-- accepté — voir lib/actions/quotes.ts::convertQuoteToSaleAction, qui
-- réutilise createSaleAction pour que la conversion passe par les mêmes
-- vérifications de stock/session que n'importe quelle autre vente.
create table quotes (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  location_id text not null references locations(id),
  number text not null,
  customer_id text references customers(id),
  customer_name text,
  customer_phone text,
  user_id text not null references users(id),
  subtotal double precision not null default 0,
  discount double precision not null default 0,
  total double precision not null default 0,
  status quote_status not null default 'BROUILLON',
  valid_until date,
  note text,
  converted_sale_id text references sales(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, number)
);
create index on quotes (business_id, created_at);
create index on quotes (location_id);
create index on quotes (customer_id);

create table quote_items (
  id text primary key default gen_random_uuid()::text,
  quote_id text not null references quotes(id) on delete cascade,
  product_id text references products(id),
  name text not null,
  unit text,
  quantity double precision not null,
  unit_price double precision not null,
  discount double precision not null default 0,
  total double precision not null
);
create index on quote_items (quote_id);

create table cash_sessions (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  location_id text not null references locations(id),
  number text not null,
  user_id text not null references users(id),
  status cash_session_status not null default 'OUVERTE',
  opening_amount double precision not null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  counted_cash double precision,
  note text,
  sales_count int,
  total_revenue double precision,
  cash_collected double precision,
  mobile_collected double precision,
  card_collected double precision,
  other_collected double precision,
  credit_collected double precision,
  gross_margin double precision,
  expenses_total double precision,
  net_margin double precision,
  margin_rate double precision,
  expected_cash double precision,
  variance double precision,
  unique (business_id, number)
);
create index on cash_sessions (business_id, location_id, status);

create table customer_payments (
  id text primary key default gen_random_uuid()::text,
  customer_id text not null references customers(id) on delete cascade,
  sale_id text references sales(id),
  amount double precision not null,
  method payment_method not null default 'ESPECES',
  note text,
  user_id text not null references users(id),
  created_at timestamptz not null default now()
);
create index on customer_payments (customer_id);

-- Échéancier (acompte + versements datés) pour une vente à crédit/partielle
-- — typiquement une vente d'engin. Un seul plan par vente. Chaque paiement
-- d'échéance (installments_pay_action) insère aussi une ligne
-- customer_payments, pour que l'historique du client reste la source
-- unique de vérité sur ce qui a été réellement encaissé.
create table installment_plans (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  sale_id text not null references sales(id) on delete cascade,
  customer_id text not null references customers(id),
  down_payment double precision not null default 0,
  created_at timestamptz not null default now(),
  unique (sale_id)
);
create index on installment_plans (business_id, customer_id);

create table installments (
  id text primary key default gen_random_uuid()::text,
  plan_id text not null references installment_plans(id) on delete cascade,
  seq int not null,
  due_date date not null,
  amount double precision not null,
  paid_amount double precision not null default 0,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index on installments (plan_id);
create index on installments (due_date);

-- ---------------------------------------------------------------------------
-- Fournisseurs / achats
-- ---------------------------------------------------------------------------
create table purchases (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  location_id text not null references locations(id),
  number text not null,
  supplier_id text not null references suppliers(id),
  user_id text not null references users(id),
  total double precision not null,
  amount_paid double precision not null default 0,
  status purchase_status not null default 'RECUE',
  note text,
  created_at timestamptz not null default now(),
  unique (business_id, number)
);
create index on purchases (business_id, created_at);
create index on purchases (location_id);
create index on purchases (supplier_id);

create table purchase_items (
  id text primary key default gen_random_uuid()::text,
  purchase_id text not null references purchases(id) on delete cascade,
  product_id text not null references products(id),
  quantity int not null,
  unit_price double precision not null,
  total double precision not null
);
create index on purchase_items (purchase_id);
create index on purchase_items (product_id);

create table supplier_payments (
  id text primary key default gen_random_uuid()::text,
  supplier_id text not null references suppliers(id) on delete cascade,
  purchase_id text references purchases(id),
  amount double precision not null,
  method payment_method not null default 'ESPECES',
  note text,
  user_id text not null references users(id),
  created_at timestamptz not null default now()
);
create index on supplier_payments (supplier_id);

-- ---------------------------------------------------------------------------
-- Inventaire
-- ---------------------------------------------------------------------------
create table inventories (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  location_id text not null references locations(id),
  reference text not null,
  status inventory_status not null default 'EN_COURS',
  note text,
  user_id text not null references users(id),
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  unique (business_id, reference)
);
create index on inventories (business_id, created_at);
create index on inventories (location_id);

create table inventory_items (
  id text primary key default gen_random_uuid()::text,
  inventory_id text not null references inventories(id) on delete cascade,
  product_id text not null references products(id),
  theoretical_qty int not null,
  real_qty int not null,
  difference int not null
);
create index on inventory_items (inventory_id);
create index on inventory_items (product_id);

-- ---------------------------------------------------------------------------
-- Transferts
-- ---------------------------------------------------------------------------
create table stock_transfers (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  number text not null,
  from_location_id text not null references locations(id),
  to_location_id text not null references locations(id),
  user_id text not null references users(id),
  note text,
  created_at timestamptz not null default now(),
  unique (business_id, number)
);
create index on stock_transfers (business_id, created_at);
create index on stock_transfers (from_location_id);
create index on stock_transfers (to_location_id);

create table stock_transfer_items (
  id text primary key default gen_random_uuid()::text,
  transfer_id text not null references stock_transfers(id) on delete cascade,
  product_id text not null references products(id),
  quantity int not null
);
create index on stock_transfer_items (transfer_id);
create index on stock_transfer_items (product_id);

-- ---------------------------------------------------------------------------
-- Dépenses, notifications, journal, paramètres
-- ---------------------------------------------------------------------------
create table expenses (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  location_id text not null references locations(id),
  label text not null,
  amount double precision not null,
  note text,
  user_id text not null references users(id),
  date timestamptz not null default now()
);
create index on expenses (business_id, date);
create index on expenses (location_id);

create table notifications (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  type notification_type not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  link text,
  created_at timestamptz not null default now()
);
create index on notifications (business_id, read);

create table audit_logs (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  user_id text not null references users(id),
  action text not null,
  entity text not null,
  entity_id text,
  details text,
  created_at timestamptz not null default now()
);
create index on audit_logs (business_id, created_at);

create table payment_method_configs (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  method payment_method not null,
  label text not null,
  enabled boolean not null default true,
  unique (business_id, method)
);
create index on payment_method_configs (business_id);

-- ---------------------------------------------------------------------------
-- Administration de la plateforme
-- ---------------------------------------------------------------------------
create table super_admins (
  id text primary key default gen_random_uuid()::text,
  email text not null unique,
  password_hash text not null,
  name text not null,
  role super_admin_role not null default 'ADMIN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table super_admin_audit_logs (
  id text primary key default gen_random_uuid()::text,
  super_admin_id text not null,
  actor_name text not null,
  action text not null,
  entity text not null,
  entity_id text,
  details text,
  created_at timestamptz not null default now()
);
create index on super_admin_audit_logs (created_at);

create table super_admin_login_events (
  id text primary key default gen_random_uuid()::text,
  email text not null,
  success boolean not null,
  super_admin_id text,
  actor_name text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index on super_admin_login_events (created_at);

create table global_role_permissions (
  id text primary key default gen_random_uuid()::text,
  role role not null,
  permission text not null,
  allowed boolean not null default true,
  unique (role, permission)
);

create table support_tickets (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  user_id text not null references users(id),
  subject text not null,
  message text not null,
  page_url text,
  status support_ticket_status not null default 'OUVERT',
  response text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on support_tickets (business_id, created_at);
create index on support_tickets (status);

-- ---------------------------------------------------------------------------
-- Déploiement progressif des fonctionnalités
-- ---------------------------------------------------------------------------
create table feature_flags (
  id text primary key default gen_random_uuid()::text,
  key text not null unique,
  label text not null,
  description text,
  enabled_globally boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table feature_flag_businesses (
  id text primary key default gen_random_uuid()::text,
  feature_flag_id text not null references feature_flags(id) on delete cascade,
  business_id text not null references businesses(id) on delete cascade,
  enabled boolean not null default true,
  unique (feature_flag_id, business_id)
);
create index on feature_flag_businesses (business_id);

-- ---------------------------------------------------------------------------
-- Boutique en ligne
-- ---------------------------------------------------------------------------
create table online_stores (
  id text primary key default gen_random_uuid()::text,
  business_id text not null unique references businesses(id) on delete cascade,
  slug text not null unique,
  store_name text not null,
  description text,
  published boolean not null default false,
  location_id text references locations(id),
  contact_phone text,
  delivery_enabled boolean not null default false,
  delivery_fee double precision not null default 0,
  free_delivery_above double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table online_orders (
  id text primary key default gen_random_uuid()::text,
  store_id text not null references online_stores(id) on delete cascade,
  number text not null,
  customer_name text not null,
  customer_phone text not null,
  delivery_address text,
  wants_delivery boolean not null default false,
  note text,
  subtotal double precision not null,
  delivery_fee double precision not null default 0,
  total double precision not null,
  status online_order_status not null default 'EN_ATTENTE',
  merchant_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, number)
);
create index on online_orders (store_id, created_at);

create table online_order_items (
  id text primary key default gen_random_uuid()::text,
  order_id text not null references online_orders(id) on delete cascade,
  product_id text not null references products(id),
  quantity int not null,
  unit_price double precision not null,
  total double precision not null
);
create index on online_order_items (order_id);
create index on online_order_items (product_id);

-- ---------------------------------------------------------------------------
-- Configuration de l'interface par activité
-- ---------------------------------------------------------------------------
create table activity_configs (
  id text primary key default gen_random_uuid()::text,
  activity_key text not null unique,
  terminology text,
  hidden_nav_hrefs text,
  default_categories text,
  custom_fields text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Abonnements & revenus
-- ---------------------------------------------------------------------------
create table subscription_plans (
  id text primary key default gen_random_uuid()::text,
  key text not null unique,
  label text not null,
  monthly_price int not null,
  annual_price int not null,
  max_products int,
  max_users int,
  max_locations int,
  features text not null,
  "order" int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table business_subscriptions (
  id text primary key default gen_random_uuid()::text,
  business_id text not null unique references businesses(id) on delete cascade,
  plan_id text not null references subscription_plans(id),
  billing_cycle billing_cycle not null default 'MONTHLY',
  status subscription_status not null default 'ACTIVE',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table subscription_invoices (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  number text not null,
  plan_key text not null,
  plan_label text not null,
  billing_cycle billing_cycle not null,
  amount int not null,
  status invoice_status not null default 'EN_ATTENTE',
  payment_method invoice_payment_method,
  payment_reference text,
  proof_note text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, number)
);
create index on subscription_invoices (business_id, created_at);

-- ---------------------------------------------------------------------------
-- Fonction utilitaire : incrémentation atomique d'un compteur de séquence
-- (next_product_seq, next_sale_seq, ...) sur businesses. Remplace le pattern
-- Prisma "update { increment: 1 } puis lire la valeur" par une opération
-- atomique unique côté base — évite toute condition de course entre deux
-- ventes/produits créés en même temps.
-- ---------------------------------------------------------------------------
create or replace function increment_business_seq(p_business_id text, p_field text)
returns int as $$
declare
  v_old int;
begin
  execute format('update businesses set %I = %I + 1 where id = $1 returning %I - 1', p_field, p_field, p_field)
    into v_old
    using p_business_id;
  return v_old;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Fonction utilitaire : ajustement atomique du stock d'un produit dans une
-- boutique (crée la ligne product_stocks si elle n'existe pas). Remplace le
-- pattern Prisma "findUnique puis update/create dans une transaction" — un
-- UPSERT Postgres est atomique par nature (verrouillage de ligne géré par la
-- base), donc pas de condition de course entre deux mouvements de stock
-- concurrents sur le même produit/boutique.
-- ---------------------------------------------------------------------------
create or replace function adjust_stock(p_product_id text, p_location_id text, p_delta int)
returns table(old_stock int, new_stock int) as $$
begin
  return query
  insert into product_stocks as ps (product_id, location_id, quantity)
  values (p_product_id, p_location_id, p_delta)
  on conflict (product_id, location_id)
  do update set quantity = ps.quantity + p_delta, updated_at = now()
  returning ps.quantity - p_delta, ps.quantity;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Fonction : inscription d'un nouveau commerce (transaction atomique). Crée
-- le commerce, le compte administrateur, les moyens de paiement par défaut,
-- une catégorie "Général", la boutique principale et l'abonnement gratuit.
-- ---------------------------------------------------------------------------
create or replace function register_business(
  p_business_name text,
  p_city text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_email text,
  p_password_hash text
)
returns table (user_id text, business_id text, role text) as $$
declare
  v_business_id text;
  v_user_id text;
  v_free_plan_id text;
begin
  insert into businesses (name, city) values (p_business_name, p_city)
    returning id into v_business_id;

  insert into users (business_id, first_name, last_name, phone, email, password_hash, role)
    values (v_business_id, p_first_name, p_last_name, p_phone, nullif(p_email, ''), p_password_hash, 'ADMIN')
    returning id into v_user_id;

  insert into payment_method_configs (business_id, method, label) values
    (v_business_id, 'ESPECES', 'Espèces'),
    (v_business_id, 'MOBILE_MONEY', 'Mobile Money'),
    (v_business_id, 'CARTE', 'Carte bancaire'),
    (v_business_id, 'CREDIT', 'Crédit');

  insert into categories (business_id, name) values (v_business_id, 'Général');

  insert into locations (business_id, name, type, city, is_default)
    values (v_business_id, 'Boutique principale', 'BOUTIQUE', p_city, true);

  select id into v_free_plan_id from subscription_plans where key = 'gratuit';
  if v_free_plan_id is not null then
    insert into business_subscriptions (business_id, plan_id, billing_cycle, status)
      values (v_business_id, v_free_plan_id, 'MONTHLY', 'ACTIVE');
  end if;

  return query select v_user_id, v_business_id, 'ADMIN'::text;
end;
$$ language plpgsql;
