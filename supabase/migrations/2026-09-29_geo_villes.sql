-- Villes du monde (GeoNames, villes de plus de 1 000 habitants), pour choisir sa
-- ville à la création des comptes et filtrer le Marché par pays et par ville.
create table if not exists geo_cities (
  id int primary key,               -- identifiant GeoNames
  name text not null,               -- nom usuel (ex. Bobo-Dioulasso)
  search text not null,             -- nom en minuscules sans accents, pour la recherche
  country_code char(2) not null,    -- code ISO du pays (BF, CI…)
  population int not null default 0
);
create index if not exists geo_cities_country_search_idx on geo_cities (country_code, search text_pattern_ops);
create index if not exists geo_cities_country_population_idx on geo_cities (country_code, population desc);

-- Données publiques en lecture seule, servies par le serveur (clé service).
alter table geo_cities enable row level security;
