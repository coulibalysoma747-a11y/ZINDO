-- Rattrape le retard entre supabase/schema.sql (la référence du dépôt) et la
-- base Supabase réellement déployée. Toutes les instructions sont idempotentes
-- (IF NOT EXISTS / gardées par un DO $$ ... $$) : le script peut être relancé
-- sans risque s'il est interrompu en cours de route.

-- --- Valeurs d'enum manquantes ---------------------------------------------
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'MIXTE';
ALTER TYPE movement_reason ADD VALUE IF NOT EXISTS 'ENLEVEMENT';

DO $$ BEGIN
  CREATE TYPE shipment_status AS ENUM ('ENVOYE','ARRIVE','RETIRE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE promo_discount_type AS ENUM ('PERCENTAGE', 'FIXED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- --- Colonnes manquantes sur des tables existantes -------------------------
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS next_barcode_seq int not null default 1;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS next_pickup_seq int not null default 1;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS next_shipment_seq int not null default 1;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS next_patient_seq int not null default 1;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ifu text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS rccm text;

ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled boolean not null default false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_backup_codes text;

ALTER TABLE super_admins ADD COLUMN IF NOT EXISTS totp_secret text;
ALTER TABLE super_admins ADD COLUMN IF NOT EXISTS totp_enabled boolean not null default false;
ALTER TABLE super_admins ADD COLUMN IF NOT EXISTS totp_backup_codes text;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS session_id text references cash_sessions(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS mobile_money_operator text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS unclaimed_at timestamptz;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method payment_method not null default 'ESPECES';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS session_id text references cash_sessions(id);

-- --- Tables manquantes ------------------------------------------------------
CREATE TABLE IF NOT EXISTS quick_supplies (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  location_id text not null references locations(id),
  product_id text not null references products(id),
  quantity int not null,
  unit_price double precision not null,
  total double precision not null,
  note text,
  user_id text not null references users(id),
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS quick_supplies_business_id_created_at_idx ON quick_supplies (business_id, created_at);

CREATE TABLE IF NOT EXISTS pickups (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  location_id text not null references locations(id),
  number text not null,
  partner_name text not null,
  partner_phone text,
  product_id text not null references products(id),
  quantity int not null,
  unit_price double precision not null,
  total double precision not null,
  amount_paid double precision not null default 0,
  note text,
  user_id text not null references users(id),
  created_at timestamptz not null default now(),
  unique (business_id, number)
);
CREATE INDEX IF NOT EXISTS pickups_business_id_created_at_idx ON pickups (business_id, created_at);

CREATE TABLE IF NOT EXISTS pickup_payments (
  id text primary key default gen_random_uuid()::text,
  pickup_id text not null references pickups(id) on delete cascade,
  amount double precision not null,
  method payment_method not null default 'ESPECES',
  note text,
  user_id text not null references users(id),
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS pickup_payments_pickup_id_idx ON pickup_payments (pickup_id);

CREATE TABLE IF NOT EXISTS shipments (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  location_id text not null references locations(id),
  number text not null,
  sale_id text references sales(id),
  carrier_name text not null,
  waybill_number text,
  destination text,
  recipient_name text,
  recipient_phone text,
  cost double precision not null default 0,
  status shipment_status not null default 'ENVOYE',
  note text,
  user_id text not null references users(id),
  created_at timestamptz not null default now(),
  arrived_at timestamptz,
  picked_up_at timestamptz,
  unique (business_id, number)
);
CREATE INDEX IF NOT EXISTS shipments_business_id_created_at_idx ON shipments (business_id, created_at);

-- Codes promo utilisables sur la boutique en ligne (/boutique/[slug]).
CREATE TABLE IF NOT EXISTS promo_codes (
  id text primary key default gen_random_uuid()::text,
  store_id text not null references online_stores(id) on delete cascade,
  code text not null,
  discount_type promo_discount_type not null,
  discount_value double precision not null,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  min_order_amount double precision not null default 0,
  usage_limit int,
  used_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, code)
);
CREATE INDEX IF NOT EXISTS promo_codes_store_id_idx ON promo_codes (store_id);

ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS promo_code_id text references promo_codes(id);
ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS discount double precision not null default 0;

-- Dérogation par boutique/dépôt (Location) pour le déploiement progressif des
-- fonctionnalités — priorité la plus haute, au-dessus de feature_flag_businesses
-- et de enabled_globally. Permet à un commerce multi-boutiques d'avoir une
-- interface différente par boutique.
CREATE TABLE IF NOT EXISTS feature_flag_locations (
  id text primary key default gen_random_uuid()::text,
  feature_flag_id text not null references feature_flags(id) on delete cascade,
  location_id text not null references locations(id) on delete cascade,
  enabled boolean not null default true,
  unique (feature_flag_id, location_id)
);
CREATE INDEX IF NOT EXISTS feature_flag_locations_location_id_idx ON feature_flag_locations (location_id);

-- Catalogue des actes médicaux (cabinet médical) et lien depuis consultations
-- — voir docs/cahier-des-charges-cabinet-medical.md §3.1.
CREATE TABLE IF NOT EXISTS medical_acts (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  name text not null,
  default_fee int not null default 0,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);
CREATE INDEX IF NOT EXISTS medical_acts_business_id_idx ON medical_acts (business_id);

ALTER TABLE consultations ADD COLUMN IF NOT EXISTS act_id text references medical_acts(id) on delete set null;
CREATE INDEX IF NOT EXISTS consultations_act_id_idx ON consultations (act_id);

-- Nom et âge exact du patient : facultatifs, à la discrétion du praticien —
-- voir docs/cahier-des-charges-cabinet-medical.md §1.
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS patient_name text;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS patient_age int;

-- Catégories de diagnostic proposées au praticien (texte dénormalisé sur
-- consultations.diagnosis, comme products.brand).
CREATE TABLE IF NOT EXISTS diagnosis_categories (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);
CREATE INDEX IF NOT EXISTS diagnosis_categories_business_id_idx ON diagnosis_categories (business_id);

-- Ordonnance (lignes de produits prescrits pendant la consultation) — voir
-- docs/cahier-des-charges-cabinet-medical.md §3.5. Ne touche jamais le stock.
CREATE TABLE IF NOT EXISTS consultation_items (
  id text primary key default gen_random_uuid()::text,
  consultation_id text not null references consultations(id) on delete cascade,
  product_id text references products(id) on delete set null,
  quantity int not null default 1,
  posology text,
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS consultation_items_consultation_id_idx ON consultation_items (consultation_id);

-- Ligne d'ordonnance libre (médicament décrit par le médecin, ex. "Paracétamol
-- 1000 mg") quand il n'existe pas dans le catalogue Produits — cohabite avec
-- product_id, au choix du médecin, voir docs/cahier-des-charges-cabinet-medical.md §3.5.
ALTER TABLE consultation_items ADD COLUMN IF NOT EXISTS custom_name text;
DO $$ BEGIN
  ALTER TABLE consultation_items ADD CONSTRAINT consultation_items_name_check CHECK (product_id IS NOT NULL OR custom_name IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Préréglages de posologie (ex. "1 fois par jour", "1 le matin et 1 le
-- soir") — voir docs/cahier-des-charges-cabinet-medical.md §3.6.
CREATE TABLE IF NOT EXISTS posology_presets (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now(),
  unique (business_id, label)
);
CREATE INDEX IF NOT EXISTS posology_presets_business_id_idx ON posology_presets (business_id);

-- Bons de réparation (atelier de réparation / pièces détachées) — voir
-- lib/actions/repairs.ts et lib/nav.ts::REPAIR_ACTIVITIES.
ALTER TYPE movement_reason ADD VALUE IF NOT EXISTS 'REPARATION';

DO $$ BEGIN
  CREATE TYPE repair_status AS ENUM ('RECU','DIAGNOSTIC','EN_COURS','ATTENTE_PIECES','TERMINE','LIVRE','ANNULE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS next_repair_seq int not null default 1;

CREATE TABLE IF NOT EXISTS repair_tickets (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  location_id text not null references locations(id),
  number text not null,
  customer_id text references customers(id),
  device_type text not null,
  device_description text,
  reported_issue text not null,
  diagnosis text,
  status repair_status not null default 'RECU',
  technician_id text references users(id),
  labor_cost double precision not null default 0,
  discount double precision not null default 0,
  amount_paid double precision not null default 0,
  payment_method payment_method,
  note text,
  user_id text not null references users(id),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  delivered_at timestamptz,
  unique (business_id, number)
);
CREATE INDEX IF NOT EXISTS repair_tickets_business_id_created_at_idx ON repair_tickets (business_id, created_at);
CREATE INDEX IF NOT EXISTS repair_tickets_business_id_status_idx ON repair_tickets (business_id, status);

CREATE TABLE IF NOT EXISTS repair_ticket_items (
  id text primary key default gen_random_uuid()::text,
  repair_ticket_id text not null references repair_tickets(id) on delete cascade,
  product_id text not null references products(id),
  quantity int not null,
  unit_price double precision not null,
  total double precision not null,
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS repair_ticket_items_repair_ticket_id_idx ON repair_ticket_items (repair_ticket_id);

-- Tables de salle (restaurant/maquis, bar/buvette) — voir
-- lib/actions/tables.ts et lib/nav.ts::TABLE_ACTIVITIES.
DO $$ BEGIN
  CREATE TYPE table_status AS ENUM ('LIBRE','OCCUPEE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE table_order_status AS ENUM ('OUVERTE','ENCAISSEE','ANNULEE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS next_table_order_seq int not null default 1;

CREATE TABLE IF NOT EXISTS restaurant_tables (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  location_id text not null references locations(id),
  name text not null,
  status table_status not null default 'LIBRE',
  created_at timestamptz not null default now(),
  unique (location_id, name)
);
CREATE INDEX IF NOT EXISTS restaurant_tables_business_id_location_id_idx ON restaurant_tables (business_id, location_id);

CREATE TABLE IF NOT EXISTS table_orders (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  location_id text not null references locations(id),
  table_id text not null references restaurant_tables(id) on delete cascade,
  number text not null,
  status table_order_status not null default 'OUVERTE',
  customer_id text references customers(id),
  sale_id text references sales(id),
  note text,
  user_id text not null references users(id),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (business_id, number)
);
CREATE INDEX IF NOT EXISTS table_orders_business_id_table_id_idx ON table_orders (business_id, table_id);
CREATE INDEX IF NOT EXISTS table_orders_table_id_status_idx ON table_orders (table_id, status);

CREATE TABLE IF NOT EXISTS table_order_items (
  id text primary key default gen_random_uuid()::text,
  table_order_id text not null references table_orders(id) on delete cascade,
  product_id text not null references products(id),
  quantity int not null,
  unit_price double precision not null,
  note text,
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS table_order_items_table_order_id_idx ON table_order_items (table_order_id);

-- Commandes sur mesure (atelier artisanal), garantie produits (électronique/
-- téléphonie) et rendez-vous (cosmétique/beauté) — voir lib/nav.ts et
-- lib/actions/custom-orders.ts, warranty.ts, appointments.ts.
DO $$ BEGIN
  CREATE TYPE custom_order_status AS ENUM ('EN_COURS','PRET','LIVRE','ANNULE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('CONFIRME','TERMINE','ANNULE','ABSENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS next_custom_order_seq int not null default 1;

CREATE TABLE IF NOT EXISTS custom_orders (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  location_id text not null references locations(id),
  number text not null,
  customer_id text not null references customers(id),
  item_description text not null,
  specifications text,
  status custom_order_status not null default 'EN_COURS',
  technician_id text references users(id),
  agreed_price double precision not null default 0,
  discount double precision not null default 0,
  amount_paid double precision not null default 0,
  payment_method payment_method,
  delivery_date date,
  note text,
  user_id text not null references users(id),
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  unique (business_id, number)
);
CREATE INDEX IF NOT EXISTS custom_orders_business_id_created_at_idx ON custom_orders (business_id, created_at);
CREATE INDEX IF NOT EXISTS custom_orders_business_id_status_idx ON custom_orders (business_id, status);

CREATE TABLE IF NOT EXISTS custom_order_items (
  id text primary key default gen_random_uuid()::text,
  custom_order_id text not null references custom_orders(id) on delete cascade,
  product_id text not null references products(id),
  quantity int not null,
  unit_price double precision not null,
  total double precision not null,
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS custom_order_items_custom_order_id_idx ON custom_order_items (custom_order_id);

CREATE TABLE IF NOT EXISTS warranty_records (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  product_id text not null references products(id),
  customer_id text references customers(id),
  serial_number text not null,
  sold_at date not null,
  warranty_months int not null,
  warranty_expires_at date not null,
  note text,
  user_id text not null references users(id),
  created_at timestamptz not null default now(),
  unique (business_id, serial_number)
);
CREATE INDEX IF NOT EXISTS warranty_records_business_id_serial_number_idx ON warranty_records (business_id, serial_number);

CREATE TABLE IF NOT EXISTS services (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  name text not null,
  duration_minutes int not null default 30,
  price double precision not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);
CREATE INDEX IF NOT EXISTS services_business_id_idx ON services (business_id);

CREATE TABLE IF NOT EXISTS appointments (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  location_id text not null references locations(id),
  customer_id text references customers(id),
  customer_name text,
  customer_phone text,
  service_id text references services(id) on delete set null,
  staff_id text references users(id),
  scheduled_at timestamptz not null,
  duration_minutes int not null default 30,
  price double precision not null default 0,
  status appointment_status not null default 'CONFIRME',
  note text,
  user_id text not null references users(id),
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS appointments_business_id_scheduled_at_idx ON appointments (business_id, scheduled_at);
CREATE INDEX IF NOT EXISTS appointments_business_id_staff_id_scheduled_at_idx ON appointments (business_id, staff_id, scheduled_at);

-- Tarification par palier ("prix de gros") — grossiste/dépôt/quincaillerie,
-- voir docs/... et lib/actions/price-tiers.ts.
CREATE TABLE IF NOT EXISTS product_price_tiers (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  product_id text not null references products(id) on delete cascade,
  min_quantity int not null,
  unit_price double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, min_quantity)
);
CREATE INDEX IF NOT EXISTS product_price_tiers_business_id_product_id_idx ON product_price_tiers (business_id, product_id);

-- Règle persistante par activité pour un feature flag : couvre aussi les
-- commerces créés plus tard avec cette activité, sans réintervention du
-- super-admin — voir lib/feature-flags.ts::isFeatureEnabled.
CREATE TABLE IF NOT EXISTS feature_flag_activities (
  id text primary key default gen_random_uuid()::text,
  feature_flag_id text not null references feature_flags(id) on delete cascade,
  activity_key text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (feature_flag_id, activity_key)
);
CREATE INDEX IF NOT EXISTS feature_flag_activities_activity_key_idx ON feature_flag_activities (activity_key);

-- --- Fonctions manquantes ---------------------------------------------------
CREATE OR REPLACE FUNCTION claim_promo_code_usage(p_promo_code_id text)
RETURNS boolean AS $$
DECLARE
  v_claimed boolean;
BEGIN
  UPDATE promo_codes
    SET used_count = used_count + 1, updated_at = now()
    WHERE id = p_promo_code_id
      AND active
      AND (usage_limit IS NULL OR used_count < usage_limit)
    RETURNING true INTO v_claimed;
  RETURN coalesce(v_claimed, false);
END;
$$ LANGUAGE plpgsql;

-- register_business : ajoute p_country (Afrique de l'Ouest, ZINDO n'est plus
-- Burkina-only) — colonne businesses.country déjà présente, ancien défaut
-- 'Burkina Faso' conservé si p_country est omis par un appelant existant.
CREATE OR REPLACE FUNCTION register_business(
  p_business_name text,
  p_city text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_email text,
  p_password_hash text,
  p_country text DEFAULT NULL
)
RETURNS TABLE (user_id text, business_id text, role text) AS $$
DECLARE
  v_business_id text;
  v_user_id text;
  v_standard_plan_id text;
BEGIN
  INSERT INTO businesses (name, city, country) VALUES (p_business_name, p_city, coalesce(p_country, 'Burkina Faso'))
    RETURNING id INTO v_business_id;

  INSERT INTO users (business_id, first_name, last_name, phone, email, password_hash, role)
    VALUES (v_business_id, p_first_name, p_last_name, p_phone, nullif(p_email, ''), p_password_hash, 'ADMIN')
    RETURNING id INTO v_user_id;

  INSERT INTO payment_method_configs (business_id, method, label) VALUES
    (v_business_id, 'ESPECES', 'Espèces'),
    (v_business_id, 'MOBILE_MONEY', 'Mobile Money'),
    (v_business_id, 'CARTE', 'Carte bancaire'),
    (v_business_id, 'CREDIT', 'Crédit');

  INSERT INTO categories (business_id, name) VALUES (v_business_id, 'Général');

  INSERT INTO locations (business_id, name, type, city, is_default)
    VALUES (v_business_id, 'Boutique principale', 'BOUTIQUE', p_city, true);

  SELECT id INTO v_standard_plan_id FROM subscription_plans WHERE key = 'standard';
  IF v_standard_plan_id IS NOT NULL THEN
    INSERT INTO business_subscriptions (business_id, plan_id, billing_cycle, status, trial_ends_at)
      VALUES (v_business_id, v_standard_plan_id, 'MONTHLY', 'TRIAL', now() + interval '7 days');
  END IF;

  RETURN QUERY SELECT v_user_id, v_business_id, 'ADMIN'::text;
END;
$$ LANGUAGE plpgsql;
