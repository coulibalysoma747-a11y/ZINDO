-- Nouveau Marché ZINDO (flag nouveau_marche), étape 2 : comptes acheteurs,
-- panier, commandes et suivi. Le stock sort à la confirmation (motif
-- COMMANDE_MARCHE) ; à « Livrée », une vraie vente fait entrer l'argent en caisse.

alter type movement_reason add value if not exists 'COMMANDE_MARCHE';

-- Livraison et paiement proposés par la boutique.
alter table market_shops add column if not exists delivery_enabled boolean not null default false;
alter table market_shops add column if not exists delivery_fee double precision not null default 0;
alter table market_shops add column if not exists delivery_note text;
alter table market_shops add column if not exists pickup_enabled boolean not null default true;
alter table market_shops add column if not exists pay_on_delivery boolean not null default true;
alter table market_shops add column if not exists pay_on_pickup boolean not null default true;
alter table market_shops add column if not exists mobile_money_enabled boolean not null default false;
alter table market_shops add column if not exists orange_money_number text;
alter table market_shops add column if not exists moov_money_number text;

-- Compte acheteur léger, distinct des comptes commerçants (pas de gestion commerciale).
create table if not exists market_buyers (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  phone text not null unique,
  password_hash text not null,
  kind text not null default 'PARTICULIER' check (kind in ('PARTICULIER', 'PRO')),
  company_name text,
  city text,
  address text,
  -- Numéro vérifié par SMS : toujours faux tant qu'aucun fournisseur SMS n'est branché.
  phone_verified boolean not null default false,
  blocked boolean not null default false,
  failed_logins int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create sequence if not exists market_order_seq;

create table if not exists market_orders (
  id text primary key default gen_random_uuid()::text,
  number text not null unique default ('ZND-' || lpad(nextval('market_order_seq')::text, 6, '0')),
  shop_id text not null references market_shops(id) on delete cascade,
  business_id text not null references businesses(id) on delete cascade,
  buyer_id text not null references market_buyers(id) on delete cascade,
  status text not null default 'RECUE'
    check (status in ('RECUE', 'CONFIRMEE', 'PREPARATION', 'PRETE', 'EN_LIVRAISON', 'LIVREE', 'ANNULEE')),
  delivery_mode text not null check (delivery_mode in ('LIVRAISON', 'RETRAIT')),
  customer_name text not null,
  customer_phone text not null,
  delivery_address text,
  delivery_city text,
  payment_method text not null check (payment_method in ('A_LA_LIVRAISON', 'AU_RETRAIT', 'MOBILE_MONEY')),
  mobile_money_operator text check (mobile_money_operator in ('ORANGE', 'MOOV')),
  mobile_money_reference text,
  subtotal double precision not null,
  delivery_fee double precision not null default 0,
  total double precision not null,
  buyer_note text,
  merchant_note text,
  cancel_reason text,
  -- Point de vente dont le stock est sorti à la confirmation (null tant que rien n'est sorti).
  stock_location_id text references locations(id) on delete set null,
  sale_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists market_orders_business_idx on market_orders (business_id, status, created_at desc);
create index if not exists market_orders_buyer_idx on market_orders (buyer_id, created_at desc);

create table if not exists market_order_items (
  id text primary key default gen_random_uuid()::text,
  order_id text not null references market_orders(id) on delete cascade,
  product_id text not null references products(id),
  name text not null,
  photo_url text,
  unit_price double precision not null,
  quantity double precision not null check (quantity > 0)
);

create index if not exists market_order_items_order_idx on market_order_items (order_id);

-- Historique des statuts (frise de suivi côté client).
create table if not exists market_order_events (
  id text primary key default gen_random_uuid()::text,
  order_id text not null references market_orders(id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now()
);

create index if not exists market_order_events_order_idx on market_order_events (order_id, created_at);

-- Lues et écrites uniquement côté serveur (clé service) : aucune politique publique.
alter table market_buyers enable row level security;
alter table market_orders enable row level security;
alter table market_order_items enable row level security;
alter table market_order_events enable row level security;
