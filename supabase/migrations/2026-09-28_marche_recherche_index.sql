-- Recherche du Marché plus rapide : index trigrammes pour « contient » (ilike '%…%')
-- sur le nom et la marque des produits, et index des produits publiés par commerce.
create extension if not exists pg_trgm;
create index if not exists products_name_trgm_idx on products using gin (name gin_trgm_ops);
create index if not exists products_brand_trgm_idx on products using gin (brand gin_trgm_ops);
create index if not exists market_listings_business_published_idx on market_listings (business_id, published, removed_by_admin);
