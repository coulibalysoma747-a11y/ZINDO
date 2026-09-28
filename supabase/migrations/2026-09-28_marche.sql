-- Nouveau Marché ZINDO (flag nouveau_marche), étape 1 : boutiques et produits publiés.
-- Le prix et la quantité ne sont jamais recopiés : ils sont lus dans products
-- et product_stocks (point de vente de la boutique), pour un seul stock central.

create table if not exists market_shops (
  id text primary key default gen_random_uuid()::text,
  business_id text not null unique references businesses(id) on delete cascade,
  -- Point de vente dont le stock est proposé sur le Marché.
  location_id text references locations(id) on delete set null,
  slug text not null unique,
  name text not null,
  description text,
  logo_url text,
  cover_url text,
  phone text,
  whatsapp text,
  city text,
  address text,
  hours text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists market_listings (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  product_id text not null unique references products(id) on delete cascade,
  -- Catégorie commune à tout le Marché (lib/market.ts), distincte des catégories du commerçant.
  market_category text not null,
  promo_price double precision,
  published boolean not null default true,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists market_listings_published_idx on market_listings (published, market_category, published_at desc);
create index if not exists market_listings_business_idx on market_listings (business_id);

-- Lues et écrites uniquement côté serveur (clé service) : aucune politique publique.
alter table market_shops enable row level security;
alter table market_listings enable row level security;
