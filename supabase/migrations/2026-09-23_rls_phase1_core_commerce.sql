-- Phase 1 du chantier RLS (suite de 2026-09-23_rls_desktop_scoped_access.sql,
-- "Phase 0") : étend l'isolation par commerce au reste du cœur métier —
-- ventes, achats, clients, fournisseurs, inventaire, transferts, dépenses,
-- historique — plus les modules spécifiques par activité (atelier, restaurant,
-- garantie, rendez-vous, location, cabinet médical...). Même principe que la
-- Phase 0, sans effet sur le site web (service_role contourne toujours RLS).
--
-- Volontairement HORS PÉRIMÈTRE ici (nécessitent une jointure à deux niveaux
-- via online_stores, ou sont réservés à la plateforme) : online_stores,
-- online_orders, online_order_items, promo_codes, feature_flag_locations,
-- ainsi que toutes les tables purement plateforme (super_admins,
-- platform_config, activity_configs, subscription_plans déjà couverte en
-- lecture seule en Phase 0, support_tickets — laissée à une future migration
-- si le support client doit devenir accessible depuis l'app Windows).
--
-- Additif et idempotent : peut être exécuté plusieurs fois sans erreur.
-- À exécuter dans l'éditeur SQL de Supabase (ou via psql sur DATABASE_URL).

-- ---------------------------------------------------------------------------
-- Fonctions utilitaires supplémentaires (mêmes principe que
-- zindo_product_business_id/zindo_user_business_id de la Phase 0).
-- ---------------------------------------------------------------------------
create or replace function zindo_sale_business_id(p_sale_id text) returns text
language sql stable as $$ select business_id from sales where id = p_sale_id $$;

create or replace function zindo_purchase_business_id(p_purchase_id text) returns text
language sql stable as $$ select business_id from purchases where id = p_purchase_id $$;

create or replace function zindo_customer_business_id(p_customer_id text) returns text
language sql stable as $$ select business_id from customers where id = p_customer_id $$;

create or replace function zindo_supplier_business_id(p_supplier_id text) returns text
language sql stable as $$ select business_id from suppliers where id = p_supplier_id $$;

create or replace function zindo_quote_business_id(p_quote_id text) returns text
language sql stable as $$ select business_id from quotes where id = p_quote_id $$;

create or replace function zindo_pending_cart_business_id(p_pending_cart_id text) returns text
language sql stable as $$ select business_id from pending_carts where id = p_pending_cart_id $$;

create or replace function zindo_installment_plan_business_id(p_plan_id text) returns text
language sql stable as $$ select business_id from installment_plans where id = p_plan_id $$;

create or replace function zindo_inventory_business_id(p_inventory_id text) returns text
language sql stable as $$ select business_id from inventories where id = p_inventory_id $$;

create or replace function zindo_stock_transfer_business_id(p_transfer_id text) returns text
language sql stable as $$ select business_id from stock_transfers where id = p_transfer_id $$;

create or replace function zindo_repair_ticket_business_id(p_repair_ticket_id text) returns text
language sql stable as $$ select business_id from repair_tickets where id = p_repair_ticket_id $$;

create or replace function zindo_custom_order_business_id(p_custom_order_id text) returns text
language sql stable as $$ select business_id from custom_orders where id = p_custom_order_id $$;

create or replace function zindo_table_order_business_id(p_table_order_id text) returns text
language sql stable as $$ select business_id from table_orders where id = p_table_order_id $$;

create or replace function zindo_consultation_business_id(p_consultation_id text) returns text
language sql stable as $$ select business_id from consultations where id = p_consultation_id $$;

create or replace function zindo_pickup_business_id(p_pickup_id text) returns text
language sql stable as $$ select business_id from pickups where id = p_pickup_id $$;

-- ---------------------------------------------------------------------------
-- Tables à colonne business_id directe : même policy pour toutes. Générée
-- pour chaque table plutôt qu'en boucle dynamique — plus long à lire, mais
-- une erreur éventuelle reste localisée à une seule table et facile à
-- corriger (voir la note dans la Phase 0 sur pourquoi on évite le SQL généré
-- dynamiquement pour une migration de sécurité).
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  direct_tables text[] := array[
    'categories', 'brands', 'suppliers', 'product_packaging_units',
    'product_price_tiers', 'product_expiry_batches', 'vehicle_units',
    'customers', 'cash_sessions', 'sales', 'pending_carts', 'quotes',
    'vehicle_sale_details', 'vehicle_registrations', 'installment_plans',
    'purchases', 'quick_supplies', 'pickups', 'shipments', 'repair_tickets',
    'restaurant_tables', 'table_orders', 'custom_orders', 'warranty_records',
    'services', 'appointments', 'inventories', 'stock_transfers', 'rentals',
    'expenses', 'medical_acts', 'diagnosis_categories', 'posology_presets',
    'consultations', 'notifications', 'push_subscriptions', 'audit_logs',
    'payment_method_configs', 'support_tickets', 'subscription_invoices',
    'api_keys'
  ];
begin
  foreach t in array direct_tables loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists zindo_tenant_isolation on %I;', t);
    execute format(
      'create policy zindo_tenant_isolation on %I using (business_id = zindo_current_business_id()) with check (business_id = zindo_current_business_id());',
      t
    );
    execute format('grant select, insert, update, delete on %I to authenticated;', t);
    execute format('revoke all on %I from anon;', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Tables enfants (pas de business_id direct — jointure vers la table parente
-- via la fonction utilitaire correspondante).
-- ---------------------------------------------------------------------------
alter table product_aliases enable row level security;
drop policy if exists zindo_tenant_isolation on product_aliases;
create policy zindo_tenant_isolation on product_aliases
  using (zindo_product_business_id(product_id) = zindo_current_business_id())
  with check (zindo_product_business_id(product_id) = zindo_current_business_id());
grant select, insert, update, delete on product_aliases to authenticated;
revoke all on product_aliases from anon;

alter table sale_items enable row level security;
drop policy if exists zindo_tenant_isolation on sale_items;
create policy zindo_tenant_isolation on sale_items
  using (zindo_sale_business_id(sale_id) = zindo_current_business_id())
  with check (zindo_sale_business_id(sale_id) = zindo_current_business_id());
grant select, insert, update, delete on sale_items to authenticated;
revoke all on sale_items from anon;

alter table purchase_items enable row level security;
drop policy if exists zindo_tenant_isolation on purchase_items;
create policy zindo_tenant_isolation on purchase_items
  using (zindo_purchase_business_id(purchase_id) = zindo_current_business_id())
  with check (zindo_purchase_business_id(purchase_id) = zindo_current_business_id());
grant select, insert, update, delete on purchase_items to authenticated;
revoke all on purchase_items from anon;

alter table quote_items enable row level security;
drop policy if exists zindo_tenant_isolation on quote_items;
create policy zindo_tenant_isolation on quote_items
  using (zindo_quote_business_id(quote_id) = zindo_current_business_id())
  with check (zindo_quote_business_id(quote_id) = zindo_current_business_id());
grant select, insert, update, delete on quote_items to authenticated;
revoke all on quote_items from anon;

alter table pending_cart_items enable row level security;
drop policy if exists zindo_tenant_isolation on pending_cart_items;
create policy zindo_tenant_isolation on pending_cart_items
  using (zindo_pending_cart_business_id(pending_cart_id) = zindo_current_business_id())
  with check (zindo_pending_cart_business_id(pending_cart_id) = zindo_current_business_id());
grant select, insert, update, delete on pending_cart_items to authenticated;
revoke all on pending_cart_items from anon;

alter table customer_payments enable row level security;
drop policy if exists zindo_tenant_isolation on customer_payments;
create policy zindo_tenant_isolation on customer_payments
  using (zindo_customer_business_id(customer_id) = zindo_current_business_id())
  with check (zindo_customer_business_id(customer_id) = zindo_current_business_id());
grant select, insert, update, delete on customer_payments to authenticated;
revoke all on customer_payments from anon;

alter table supplier_payments enable row level security;
drop policy if exists zindo_tenant_isolation on supplier_payments;
create policy zindo_tenant_isolation on supplier_payments
  using (zindo_supplier_business_id(supplier_id) = zindo_current_business_id())
  with check (zindo_supplier_business_id(supplier_id) = zindo_current_business_id());
grant select, insert, update, delete on supplier_payments to authenticated;
revoke all on supplier_payments from anon;

alter table installments enable row level security;
drop policy if exists zindo_tenant_isolation on installments;
create policy zindo_tenant_isolation on installments
  using (zindo_installment_plan_business_id(plan_id) = zindo_current_business_id())
  with check (zindo_installment_plan_business_id(plan_id) = zindo_current_business_id());
grant select, insert, update, delete on installments to authenticated;
revoke all on installments from anon;

alter table inventory_items enable row level security;
drop policy if exists zindo_tenant_isolation on inventory_items;
create policy zindo_tenant_isolation on inventory_items
  using (zindo_inventory_business_id(inventory_id) = zindo_current_business_id())
  with check (zindo_inventory_business_id(inventory_id) = zindo_current_business_id());
grant select, insert, update, delete on inventory_items to authenticated;
revoke all on inventory_items from anon;

alter table stock_transfer_items enable row level security;
drop policy if exists zindo_tenant_isolation on stock_transfer_items;
create policy zindo_tenant_isolation on stock_transfer_items
  using (zindo_stock_transfer_business_id(transfer_id) = zindo_current_business_id())
  with check (zindo_stock_transfer_business_id(transfer_id) = zindo_current_business_id());
grant select, insert, update, delete on stock_transfer_items to authenticated;
revoke all on stock_transfer_items from anon;

alter table repair_ticket_items enable row level security;
drop policy if exists zindo_tenant_isolation on repair_ticket_items;
create policy zindo_tenant_isolation on repair_ticket_items
  using (zindo_repair_ticket_business_id(repair_ticket_id) = zindo_current_business_id())
  with check (zindo_repair_ticket_business_id(repair_ticket_id) = zindo_current_business_id());
grant select, insert, update, delete on repair_ticket_items to authenticated;
revoke all on repair_ticket_items from anon;

alter table custom_order_items enable row level security;
drop policy if exists zindo_tenant_isolation on custom_order_items;
create policy zindo_tenant_isolation on custom_order_items
  using (zindo_custom_order_business_id(custom_order_id) = zindo_current_business_id())
  with check (zindo_custom_order_business_id(custom_order_id) = zindo_current_business_id());
grant select, insert, update, delete on custom_order_items to authenticated;
revoke all on custom_order_items from anon;

alter table table_order_items enable row level security;
drop policy if exists zindo_tenant_isolation on table_order_items;
create policy zindo_tenant_isolation on table_order_items
  using (zindo_table_order_business_id(table_order_id) = zindo_current_business_id())
  with check (zindo_table_order_business_id(table_order_id) = zindo_current_business_id());
grant select, insert, update, delete on table_order_items to authenticated;
revoke all on table_order_items from anon;

alter table consultation_items enable row level security;
drop policy if exists zindo_tenant_isolation on consultation_items;
create policy zindo_tenant_isolation on consultation_items
  using (zindo_consultation_business_id(consultation_id) = zindo_current_business_id())
  with check (zindo_consultation_business_id(consultation_id) = zindo_current_business_id());
grant select, insert, update, delete on consultation_items to authenticated;
revoke all on consultation_items from anon;

alter table pickup_payments enable row level security;
drop policy if exists zindo_tenant_isolation on pickup_payments;
create policy zindo_tenant_isolation on pickup_payments
  using (zindo_pickup_business_id(pickup_id) = zindo_current_business_id())
  with check (zindo_pickup_business_id(pickup_id) = zindo_current_business_id());
grant select, insert, update, delete on pickup_payments to authenticated;
revoke all on pickup_payments from anon;

-- ---------------------------------------------------------------------------
-- feature_flags : registre global (pas de business_id — une seule fiche par
-- fonctionnalité pour toute la plateforme, voir lib/feature-flags.ts). Un
-- commerce authentifié peut lire n'importe quel flag et en créer un nouveau
-- s'il n'existe pas encore (registerFeatureFlag, appelé paresseusement à
-- chaque page — voir app/(app)/layout.tsx), mais jamais modifier/supprimer un
-- flag existant : seule la console /admin (service_role) active/désactive.
-- ---------------------------------------------------------------------------
alter table feature_flags enable row level security;
drop policy if exists zindo_read_create on feature_flags;
drop policy if exists zindo_create_only on feature_flags;
create policy zindo_read_create on feature_flags for select using (true);
create policy zindo_create_only on feature_flags for insert with check (true);
grant select, insert on feature_flags to authenticated;
revoke all on feature_flags from anon;

-- feature_flag_businesses : dérogation par commerce — lecture seule pour
-- "authenticated" (seul l'admin plateforme en crée/modifie, via /admin/fonctionnalites).
alter table feature_flag_businesses enable row level security;
drop policy if exists zindo_tenant_isolation on feature_flag_businesses;
create policy zindo_tenant_isolation on feature_flag_businesses
  for select using (business_id = zindo_current_business_id());
grant select on feature_flag_businesses to authenticated;
revoke all on feature_flag_businesses from anon;
