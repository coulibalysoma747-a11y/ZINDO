-- Ajoute une clé d'idempotence (client_ref) à 6 tables, sur le même principe
-- que sales.client_ref déjà en place — nécessaire pour que l'application
-- Windows hors ligne (lib/offline/) puisse rejouer en sécurité une écriture
-- faite hors connexion sans jamais créer de doublon en cas de synchronisation
-- interrompue/relancée. NULL pour toute ligne créée normalement en ligne —
-- une contrainte unique standard autorise plusieurs NULL sans conflit.
--
-- Additif uniquement : aucune donnée existante n'est modifiée ou supprimée.
-- Idempotent : peut être exécuté plusieurs fois sans erreur si une partie a
-- déjà été appliquée.
--
-- À exécuter dans l'éditeur SQL de Supabase (ou via psql sur DATABASE_URL).

alter table products add column if not exists client_ref text;
alter table stock_movements add column if not exists client_ref text;
alter table customers add column if not exists client_ref text;
alter table suppliers add column if not exists client_ref text;
alter table purchases add column if not exists client_ref text;
alter table inventories add column if not exists client_ref text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_business_id_client_ref_key') then
    alter table products add constraint products_business_id_client_ref_key unique (business_id, client_ref);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'stock_movements_business_id_client_ref_key') then
    alter table stock_movements add constraint stock_movements_business_id_client_ref_key unique (business_id, client_ref);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'customers_business_id_client_ref_key') then
    alter table customers add constraint customers_business_id_client_ref_key unique (business_id, client_ref);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'suppliers_business_id_client_ref_key') then
    alter table suppliers add constraint suppliers_business_id_client_ref_key unique (business_id, client_ref);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'purchases_business_id_client_ref_key') then
    alter table purchases add constraint purchases_business_id_client_ref_key unique (business_id, client_ref);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'inventories_business_id_client_ref_key') then
    alter table inventories add constraint inventories_business_id_client_ref_key unique (business_id, client_ref);
  end if;
end $$;
