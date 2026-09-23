-- Active Row Level Security (RLS), isolée par commerce, sur les tables
-- nécessaires au chemin critique connexion + permissions + stock — première
-- tranche ("Phase 0") d'un chantier plus large, voir la mémoire "Electron
-- desktop build" et le plan associé.
--
-- Pourquoi : l'application Windows (Electron) ne doit plus jamais embarquer
-- SUPABASE_SERVICE_ROLE_KEY (qui contourne tout et donne accès à TOUS les
-- commerces — voir electron/env.generated.ts). Elle utilise désormais, après
-- connexion via app/api/desktop/login/route.ts, un jeton Supabase "authenticated"
-- limité au commerce du commerçant connecté (voir lib/supabase.ts
-- setDesktopSupabaseClient). Ce jeton ne vaut que ce que Postgres veut bien
-- lui laisser voir : sans RLS, un jeton volé donnerait quand même accès à
-- toutes les lignes de ces tables pour n'importe quel commerce (le rôle
-- "authenticated" a par défaut les mêmes GRANTs larges que sur un projet
-- Supabase neuf). Cette migration est SANS EFFET sur le site web : le rôle
-- service_role (utilisé partout ailleurs, voir lib/supabase.ts) contourne
-- toujours RLS par construction Postgres/Supabase.
--
-- Additif et idempotent : peut être exécuté plusieurs fois sans erreur.
-- À exécuter dans l'éditeur SQL de Supabase (ou via psql sur DATABASE_URL).
--
-- Tables couvertes ici (chemin connexion + permissions + stock uniquement) :
-- businesses, users, role_permissions, user_permissions, business_subscriptions,
-- products, product_stocks, locations, stock_movements — plus deux tables de
-- référence plateforme, en lecture seule : subscription_plans,
-- global_role_permissions. Le reste du schéma (ventes, achats, clients,
-- fournisseurs, inventaire, activités spécifiques...) sera couvert par les
-- mêmes deux motifs (colonne business_id directe, ou jointure vers la table
-- parente) dans une migration de suivi — voir le plan pour le phasage complet.

-- ---------------------------------------------------------------------------
-- Rôle "authenticated" : accès refusé par défaut, sauf GRANT explicite
-- ci-dessous table par table. Aucun accès pour "anon" (ZINDO n'utilise jamais
-- ce rôle — pas de client Supabase côté navigateur).
-- ---------------------------------------------------------------------------
revoke all on businesses, users, role_permissions, user_permissions,
  business_subscriptions, subscription_plans, global_role_permissions,
  products, product_stocks, locations, stock_movements
  from anon;

-- ---------------------------------------------------------------------------
-- Fonctions utilitaires : lisent zindo_business_id depuis le JWT que
-- app/api/desktop/login/route.ts signe avec SUPABASE_JWT_SECRET (claim
-- personnalisée, voir lib/supabase.ts). NULL si absent (service_role
-- n'atteint jamais ce code : RLS ne s'applique pas à ce rôle).
-- ---------------------------------------------------------------------------
create or replace function zindo_current_business_id() returns text
language sql stable
as $$
  select nullif(current_setting('request.jwt.claims', true), '')::json ->> 'zindo_business_id';
$$;

create or replace function zindo_product_business_id(p_product_id text) returns text
language sql stable
as $$
  select business_id from products where id = p_product_id;
$$;

create or replace function zindo_user_business_id(p_user_id text) returns text
language sql stable
as $$
  select business_id from users where id = p_user_id;
$$;

-- ---------------------------------------------------------------------------
-- businesses : clé primaire "id" (pas "business_id"). Pas d'INSERT/DELETE
-- pour "authenticated" — un commerce n'est créé que par register_business()
-- (RPC appelée avec service_role, voir lib/actions/auth.ts registerAction).
-- ---------------------------------------------------------------------------
alter table businesses enable row level security;
drop policy if exists zindo_tenant_isolation on businesses;
create policy zindo_tenant_isolation on businesses
  using (id = zindo_current_business_id())
  with check (id = zindo_current_business_id());
grant select, update on businesses to authenticated;

-- ---------------------------------------------------------------------------
-- users : colonne business_id directe.
-- ---------------------------------------------------------------------------
alter table users enable row level security;
drop policy if exists zindo_tenant_isolation on users;
create policy zindo_tenant_isolation on users
  using (business_id = zindo_current_business_id())
  with check (business_id = zindo_current_business_id());
grant select, insert, update, delete on users to authenticated;

-- ---------------------------------------------------------------------------
-- role_permissions : colonne business_id directe.
-- ---------------------------------------------------------------------------
alter table role_permissions enable row level security;
drop policy if exists zindo_tenant_isolation on role_permissions;
create policy zindo_tenant_isolation on role_permissions
  using (business_id = zindo_current_business_id())
  with check (business_id = zindo_current_business_id());
grant select, insert, update, delete on role_permissions to authenticated;

-- ---------------------------------------------------------------------------
-- user_permissions : pas de business_id direct — jointure via user_id.
-- ---------------------------------------------------------------------------
alter table user_permissions enable row level security;
drop policy if exists zindo_tenant_isolation on user_permissions;
create policy zindo_tenant_isolation on user_permissions
  using (zindo_user_business_id(user_id) = zindo_current_business_id())
  with check (zindo_user_business_id(user_id) = zindo_current_business_id());
grant select, insert, update, delete on user_permissions to authenticated;

-- ---------------------------------------------------------------------------
-- business_subscriptions : colonne business_id directe. Pas de DELETE pour
-- "authenticated" (voir lib/subscription.ts ensureSubscriptionRow : select +
-- insert seulement, jamais de suppression côté app).
-- ---------------------------------------------------------------------------
alter table business_subscriptions enable row level security;
drop policy if exists zindo_tenant_isolation on business_subscriptions;
create policy zindo_tenant_isolation on business_subscriptions
  using (business_id = zindo_current_business_id())
  with check (business_id = zindo_current_business_id());
grant select, insert, update on business_subscriptions to authenticated;

-- ---------------------------------------------------------------------------
-- subscription_plans, global_role_permissions : données de référence
-- plateforme, pas de business_id — légitimement lisibles par tout commerce
-- connecté, jamais modifiables depuis l'app (console /admin uniquement, en
-- service_role). Lecture seule pour "authenticated".
-- ---------------------------------------------------------------------------
alter table subscription_plans enable row level security;
drop policy if exists zindo_read_only on subscription_plans;
create policy zindo_read_only on subscription_plans using (true);
grant select on subscription_plans to authenticated;

alter table global_role_permissions enable row level security;
drop policy if exists zindo_read_only on global_role_permissions;
create policy zindo_read_only on global_role_permissions using (true);
grant select on global_role_permissions to authenticated;

-- ---------------------------------------------------------------------------
-- products : colonne business_id directe.
-- ---------------------------------------------------------------------------
alter table products enable row level security;
drop policy if exists zindo_tenant_isolation on products;
create policy zindo_tenant_isolation on products
  using (business_id = zindo_current_business_id())
  with check (business_id = zindo_current_business_id());
grant select, insert, update, delete on products to authenticated;

-- ---------------------------------------------------------------------------
-- product_stocks : pas de business_id direct — jointure via product_id.
-- ---------------------------------------------------------------------------
alter table product_stocks enable row level security;
drop policy if exists zindo_tenant_isolation on product_stocks;
create policy zindo_tenant_isolation on product_stocks
  using (zindo_product_business_id(product_id) = zindo_current_business_id())
  with check (zindo_product_business_id(product_id) = zindo_current_business_id());
grant select, insert, update, delete on product_stocks to authenticated;

-- ---------------------------------------------------------------------------
-- locations : colonne business_id directe.
-- ---------------------------------------------------------------------------
alter table locations enable row level security;
drop policy if exists zindo_tenant_isolation on locations;
create policy zindo_tenant_isolation on locations
  using (business_id = zindo_current_business_id())
  with check (business_id = zindo_current_business_id());
grant select, insert, update, delete on locations to authenticated;

-- ---------------------------------------------------------------------------
-- stock_movements : colonne business_id directe.
-- ---------------------------------------------------------------------------
alter table stock_movements enable row level security;
drop policy if exists zindo_tenant_isolation on stock_movements;
create policy zindo_tenant_isolation on stock_movements
  using (business_id = zindo_current_business_id())
  with check (business_id = zindo_current_business_id());
grant select, insert, update, delete on stock_movements to authenticated;

-- ---------------------------------------------------------------------------
-- Fonctions RPC (adjust_stock, get_dashboard_stock_summary, ...) : aucune
-- n'est déclarée SECURITY DEFINER dans schema.sql (vérifié — aucune occurrence
-- de "security definer"), donc toutes s'exécutent avec les droits de l'appelant
-- ("SECURITY INVOKER", le défaut Postgres). adjust_stock() écrit dans
-- product_stocks, qui a maintenant sa policy RLS ci-dessus : un jeton
-- "authenticated" d'un autre commerce s'y fait donc déjà rejeter par Postgres
-- lui-même à l'intérieur de la fonction, sans qu'il soit nécessaire de modifier
-- adjust_stock (dont le corps réel n'a pas été relu ligne à ligne ici — le
-- réécrire à la main aurait été un risque inutile pour un gain nul).
-- ---------------------------------------------------------------------------
