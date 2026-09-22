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
