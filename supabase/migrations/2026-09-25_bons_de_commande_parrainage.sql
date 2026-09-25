-- Réassort intelligent, demandes de prix / bons de commande fournisseur et
-- parrainage — derrière les feature flags "bons-de-commande" et "parrainage"
-- (désactivés par défaut, voir lib/feature-flags.ts).
--
-- Additif et idempotent : peut être exécuté plusieurs fois sans erreur.
-- À exécuter dans l'éditeur SQL de Supabase (ou via psql sur DATABASE_URL).

-- ---------------------------------------------------------------------------
-- Données utilisées par le réassort
-- ---------------------------------------------------------------------------

-- Nombre d'unités dans un carton (fiche produit) : le réassort arrondit
-- toujours la quantité suggérée au carton supérieur. NULL = pas de carton.
alter table products add column if not exists units_per_carton int;

-- Délai habituel entre la commande et la livraison, en jours (fiche
-- fournisseur). NULL = 7 jours par défaut côté réassort.
alter table suppliers add column if not exists lead_time_days int;

-- Frais de transport payés pour un achat : sert à calculer le coût rendu
-- boutique (prix + part du transport) de chaque fournisseur.
alter table purchases add column if not exists transport_cost double precision not null default 0;

alter table businesses add column if not exists next_purchase_order_seq int not null default 1;

-- ---------------------------------------------------------------------------
-- Demandes de prix / bons de commande fournisseur
--
-- Une même ligne passe par : BROUILLON → ENVOYEE (demande de prix, sans prix)
-- → PRIX_RECUS (prix saisis par le commerçant) → CONFIRMEE (bon de commande)
-- → RECUE (réception : crée l'achat réel et fait entrer le stock), ou
-- ANNULEE à tout moment. Une mise en concurrence = plusieurs lignes (une par
-- fournisseur) qui partagent le même group_number ; chacune a son suffixe
-- (-A, -B, -C...) dans number.
-- ---------------------------------------------------------------------------
create table if not exists purchase_orders (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  location_id text not null references locations(id),
  supplier_id text not null references suppliers(id),
  user_id text not null references users(id),
  -- Ex. "2026-000012-A" : affiché "DP-..." tant que c'est une demande de prix,
  -- "BC-..." une fois la commande confirmée.
  number text not null,
  group_number text not null,
  status text not null default 'BROUILLON'
    check (status in ('BROUILLON','ENVOYEE','PRIX_RECUS','CONFIRMEE','RECUE','ANNULEE')),
  transport_cost double precision,
  discount double precision not null default 0,
  response_by date,
  expected_delivery_date date,
  delivery_place text,
  payment_terms text,
  deposit double precision not null default 0,
  note text,
  -- Achat réel créé à la réception (voir lib/actions/purchase-orders.ts).
  purchase_id text references purchases(id),
  sent_at timestamptz,
  confirmed_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, number)
);
create index if not exists purchase_orders_business_idx on purchase_orders (business_id, created_at);
create index if not exists purchase_orders_group_idx on purchase_orders (business_id, group_number);
create index if not exists purchase_orders_supplier_idx on purchase_orders (supplier_id);

create table if not exists purchase_order_items (
  id text primary key default gen_random_uuid()::text,
  order_id text not null references purchase_orders(id) on delete cascade,
  product_id text not null references products(id),
  -- Quantité en unités de base (le carton est déduit de products.units_per_carton).
  quantity int not null,
  -- NULL tant que le fournisseur n'a pas communiqué son prix.
  unit_price double precision,
  received_quantity int,
  position int not null default 0
);
create index if not exists purchase_order_items_order_idx on purchase_order_items (order_id);
create index if not exists purchase_order_items_product_idx on purchase_order_items (product_id);

-- ---------------------------------------------------------------------------
-- Parrainage
-- ---------------------------------------------------------------------------
alter table businesses add column if not exists referral_code text;
create unique index if not exists businesses_referral_code_idx on businesses (referral_code);

-- Un commerce ne peut être parrainé qu'une seule fois (unique referred_business_id).
-- status : INSCRIT → VALIDE (premier abonnement payé : récompense accordée)
-- ou ANNULE (fraude, annulé depuis l'admin). "Actif" est calculé à
-- l'affichage (ventes enregistrées), pas stocké.
create table if not exists referrals (
  id text primary key default gen_random_uuid()::text,
  referrer_business_id text not null references businesses(id) on delete cascade,
  referred_business_id text not null unique references businesses(id) on delete cascade,
  code text not null,
  -- bon_commande, demande_prix, facture, ticket, whatsapp, lien, manuel
  source text,
  status text not null default 'INSCRIT' check (status in ('INSCRIT','VALIDE','ANNULE')),
  reward_months int not null default 0,
  rewarded_at timestamptz,
  cancelled_reason text,
  created_at timestamptz not null default now()
);
create index if not exists referrals_referrer_idx on referrals (referrer_business_id, created_at);

-- ---------------------------------------------------------------------------
-- RLS (application Windows) — même principe que 2026-09-23_rls_phase1_core_commerce.sql.
-- ---------------------------------------------------------------------------
create or replace function zindo_purchase_order_business_id(p_order_id text) returns text
language sql stable as $$ select business_id from purchase_orders where id = p_order_id $$;

alter table purchase_orders enable row level security;
drop policy if exists zindo_tenant_isolation on purchase_orders;
create policy zindo_tenant_isolation on purchase_orders
  using (business_id = zindo_current_business_id())
  with check (business_id = zindo_current_business_id());
grant select, insert, update, delete on purchase_orders to authenticated;
revoke all on purchase_orders from anon;

alter table purchase_order_items enable row level security;
drop policy if exists zindo_tenant_isolation on purchase_order_items;
create policy zindo_tenant_isolation on purchase_order_items
  using (zindo_purchase_order_business_id(order_id) = zindo_current_business_id())
  with check (zindo_purchase_order_business_id(order_id) = zindo_current_business_id());
grant select, insert, update, delete on purchase_order_items to authenticated;
revoke all on purchase_order_items from anon;

-- Le parrain ne fait que consulter ses filleuls ; la création et la
-- validation se font toujours côté serveur (service_role).
alter table referrals enable row level security;
drop policy if exists zindo_tenant_isolation on referrals;
create policy zindo_tenant_isolation on referrals
  for select using (referrer_business_id = zindo_current_business_id());
grant select on referrals to authenticated;
revoke all on referrals from anon;
