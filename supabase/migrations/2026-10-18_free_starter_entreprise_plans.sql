begin;

-- Keep the existing "pro" key so historical invoices and subscriptions remain valid.
insert into subscription_plans (
  key, label, monthly_price, annual_price, max_products, max_users, max_locations, features, "order"
) values
  (
    'free', 'Free', 0, 0, 50, 1, 1,
    '["stock","pos","clients","suppliers","tickets","basic_reports"]', 1
  ),
  (
    'starter', 'Starter', 5000, 0, 500, 3, 1,
    '["stock","pos","clients","suppliers","tickets","basic_reports","advanced_stock","inventory","expenses","credits","promotions","advanced_reports","auto_backup","deliveries"]', 2
  ),
  (
    'pro', 'Entreprise', 7500, 75000, null, 10, 5,
    '["stock","pos","clients","suppliers","tickets","basic_reports","advanced_stock","inventory","expenses","credits","promotions","advanced_reports","auto_backup","advanced_stats","assistant_ia","boutique_en_ligne","deliveries","smart_analysis","advanced_backups","priority_support_active","advanced_permissions","centralized_control","consolidated_reports","api_access","priority_support"]', 3
  )
on conflict (key) do update set
  label = excluded.label,
  monthly_price = excluded.monthly_price,
  annual_price = excluded.annual_price,
  max_products = excluded.max_products,
  max_users = excluded.max_users,
  max_locations = excluded.max_locations,
  features = excluded.features,
  "order" = excluded."order",
  updated_at = now();

-- Grandfather paid legacy tiers into Entreprise. Old Free accounts move to the
-- new permanent Free tier; no products, users, locations, or invoices are deleted.
update business_subscriptions
set plan_id = (select id from subscription_plans where key = 'pro'), updated_at = now()
where plan_id in (select id from subscription_plans where key in ('standard', 'premium'));

update business_subscriptions
set plan_id = (select id from subscription_plans where key = 'free'),
    status = 'ACTIVE',
    billing_cycle = 'MONTHLY',
    trial_ends_at = null,
    current_period_end = null,
    updated_at = now()
where plan_id in (select id from subscription_plans where key = 'gratuit');

delete from subscription_plans where key in ('standard', 'premium', 'gratuit');

commit;
