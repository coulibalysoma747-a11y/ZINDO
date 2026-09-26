-- Fonctions du tableau de bord (voir lib/actions/dashboard.ts), présentes
-- dans supabase/schema.sql depuis le 2026-09-16 mais jamais créées en
-- production : le tableau de bord affichait « 0 produit(s) en stock », des
-- alertes de rupture/stock faible vides et aucun « produit le plus vendu ».
-- Copie conforme de schema.sql, sans effet sur les données (lecture seule).

create or replace function get_dashboard_stock_summary(p_business_id text, p_location_id text, p_low_stock_limit int default 6)
returns json as $$
  with stock as (
    select ps.quantity, p.id as product_id, p.name, p.purchase_price, p.min_stock
    from product_stocks ps
    join products p on p.id = ps.product_id
    where ps.location_id = p_location_id and p.business_id = p_business_id and p.active = true
  ),
  low_stock as (
    select product_id, name, quantity, min_stock
    from stock
    where quantity > 0 and quantity <= min_stock
    order by name
    limit p_low_stock_limit
  )
  select json_build_object(
    'stockValue', coalesce((select sum(quantity * purchase_price) from stock), 0),
    'productCount', (select count(*) from stock where quantity > 0),
    'outOfStockCount', (select count(*) from stock where quantity <= 0),
    'lowStockCount', (select count(*) from stock where quantity > 0 and quantity <= min_stock),
    'lowStockProducts', coalesce((select json_agg(low_stock) from low_stock), '[]'::json)
  );
$$ language sql stable;

create or replace function get_top_products(p_business_id text, p_location_id text, p_month_start timestamptz, p_limit int default 5)
returns table(product_id text, name text, quantity double precision, total double precision) as $$
  select p.id, p.name, sum(si.quantity)::double precision, sum(si.total)::double precision
  from sale_items si
  join sales s on s.id = si.sale_id
  join products p on p.id = si.product_id
  where s.business_id = p_business_id
    and s.location_id = p_location_id
    and s.status != 'ANNULEE'
    and s.created_at >= p_month_start
  group by p.id, p.name
  order by sum(si.quantity) desc
  limit p_limit;
$$ language sql stable;

create or replace function get_locations_stock_overview(p_business_id text)
returns table(location_id text, stock_value double precision) as $$
  select ps.location_id, coalesce(sum(ps.quantity * p.purchase_price), 0)::double precision
  from product_stocks ps
  join products p on p.id = ps.product_id
  join locations l on l.id = ps.location_id
  where l.business_id = p_business_id and p.business_id = p_business_id and l.active = true
  group by ps.location_id;
$$ language sql stable;

-- Recharge le cache de l'API pour que les fonctions soient visibles tout de suite.
notify pgrst, 'reload schema';
