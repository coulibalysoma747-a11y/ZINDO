-- Pays (code ISO) des boutiques et des acheteurs du Marché, pour filtrer par pays puis par ville.
alter table market_shops add column if not exists country_code char(2) not null default 'BF';
alter table market_buyers add column if not exists country_code char(2) not null default 'BF';
create index if not exists market_shops_country_city_idx on market_shops (country_code, city);
