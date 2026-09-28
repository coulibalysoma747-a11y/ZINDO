-- Nouveau Marché ZINDO, étape 3 : popularité, favoris, avis, signalements et
-- galerie de photos. Tout est écrit côté serveur (clé service) : aucune politique publique.

-- Popularité (« Produits populaires ») et visites (tableau de bord vendeur).
alter table market_listings add column if not exists view_count int not null default 0;
alter table market_shops add column if not exists view_count int not null default 0;

-- Vues par jour, pour les graphiques du vendeur.
create table if not exists market_daily_views (
  business_id text not null references businesses(id) on delete cascade,
  day date not null,
  product_views int not null default 0,
  shop_views int not null default 0,
  primary key (business_id, day)
);

-- Incrément atomique (pas de lecture-écriture concurrente côté serveur).
create or replace function market_record_view(p_listing_id text, p_shop_id text)
returns void language plpgsql security definer set search_path = public as $$
declare v_business text;
begin
  if p_listing_id is not null then
    update market_listings set view_count = view_count + 1 where id = p_listing_id returning business_id into v_business;
    if v_business is not null then
      insert into market_daily_views (business_id, day, product_views) values (v_business, current_date, 1)
      on conflict (business_id, day) do update set product_views = market_daily_views.product_views + 1;
    end if;
  end if;
  if p_shop_id is not null then
    update market_shops set view_count = view_count + 1 where id = p_shop_id returning business_id into v_business;
    if v_business is not null then
      insert into market_daily_views (business_id, day, shop_views) values (v_business, current_date, 1)
      on conflict (business_id, day) do update set shop_views = market_daily_views.shop_views + 1;
    end if;
  end if;
end $$;
revoke all on function market_record_view(text, text) from public, anon, authenticated;

-- Photos supplémentaires d'un produit publié (la photo principale reste products.photo_url).
create table if not exists market_listing_photos (
  id text primary key default gen_random_uuid()::text,
  listing_id text not null references market_listings(id) on delete cascade,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists market_listing_photos_listing_idx on market_listing_photos (listing_id, position);

-- Favoris : produits et boutiques suivies.
create table if not exists market_favorites (
  buyer_id text not null references market_buyers(id) on delete cascade,
  listing_id text references market_listings(id) on delete cascade,
  shop_id text references market_shops(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((listing_id is null) <> (shop_id is null))
);
create unique index if not exists market_favorites_listing_uq on market_favorites (buyer_id, listing_id) where listing_id is not null;
create unique index if not exists market_favorites_shop_uq on market_favorites (buyer_id, shop_id) where shop_id is not null;

-- Avis : un par produit d'une commande livrée.
create table if not exists market_reviews (
  id text primary key default gen_random_uuid()::text,
  order_id text not null references market_orders(id) on delete cascade,
  buyer_id text not null references market_buyers(id) on delete cascade,
  business_id text not null references businesses(id) on delete cascade,
  shop_id text not null references market_shops(id) on delete cascade,
  product_id text not null references products(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);
create index if not exists market_reviews_product_idx on market_reviews (product_id, created_at desc);
create index if not exists market_reviews_shop_idx on market_reviews (shop_id, created_at desc);

-- Signalements (produit ou boutique), traités dans l'administration.
create table if not exists market_reports (
  id text primary key default gen_random_uuid()::text,
  listing_id text references market_listings(id) on delete cascade,
  shop_id text references market_shops(id) on delete cascade,
  reason text not null check (reason in ('INTERDIT', 'FRAUDE', 'FAUSSE_INFO', 'PRIX_TROMPEUR', 'CONTREFACON', 'INAPPROPRIE', 'AUTRE')),
  details text,
  buyer_id text references market_buyers(id) on delete set null,
  status text not null default 'OUVERT' check (status in ('OUVERT', 'TRAITE', 'REJETE')),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
create index if not exists market_reports_status_idx on market_reports (status, created_at desc);

-- Suspension d'une boutique ou retrait d'une annonce par l'administration ZINDO.
alter table market_shops add column if not exists suspended boolean not null default false;
alter table market_shops add column if not exists suspended_reason text;
alter table market_listings add column if not exists removed_by_admin boolean not null default false;
alter table market_listings add column if not exists removed_reason text;

alter table market_daily_views enable row level security;
alter table market_listing_photos enable row level security;
alter table market_favorites enable row level security;
alter table market_reviews enable row level security;
alter table market_reports enable row level security;
