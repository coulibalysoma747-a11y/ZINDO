-- Prix de revient : arrivages (frais d'approche répartis sur les articles), prix conseillés,
-- application au catalogue avec retour arrière, et historique des prix.
-- Idempotent : peut être relancé sans danger. À exécuter dans le SQL Editor de Supabase.

-- ---------------------------------------------------------------------------
-- Arrivages
-- ---------------------------------------------------------------------------
-- status : BROUILLON (simulation, rien ne bouge) → EN_COURS (application commencée, reprise possible)
-- → APPLIQUE (verrouillé) → RETABLI (anciens prix remis ; le stock reste).
create table if not exists cost_arrivals (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  location_id text not null references locations(id),
  supplier_id text references suppliers(id) on delete set null,
  name text not null,
  reference text,
  arrival_date date not null default current_date,
  status text not null default 'BROUILLON' check (status in ('BROUILLON', 'EN_COURS', 'APPLIQUE', 'RETABLI')),
  -- ENTRER_STOCK : le stock augmente à l'application ; PRIX_SEULEMENT : la marchandise est déjà enregistrée.
  stock_mode text not null default 'PRIX_SEULEMENT' check (stock_mode in ('ENTRER_STOCK', 'PRIX_SEULEMENT')),
  -- Prix d'achat = moyenne pondérée avec l'ancien stock (recommandé) ou coût de cet arrivage seul.
  average_with_old boolean not null default true,
  margin_mode text not null default 'ADD_PERCENT' check (margin_mode in ('ADD_PERCENT', 'KEEP_PERCENT', 'ADD_AMOUNT', 'FIXED_PRICE')),
  margin_value double precision not null default 20,
  rounding_step double precision not null default 1,
  -- Devise de saisie et valeur de 1 unité en monnaie du commerce.
  currency text not null default 'XOF',
  fx_rate double precision not null default 1,
  -- Achat repris (lignes recopiées) : l'arrivage passe alors en « prix seulement ».
  purchase_id text references purchases(id) on delete set null,
  applied_at timestamptz,
  reverted_at timestamptz,
  created_by text references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cost_arrivals_business_idx on cost_arrivals (business_id, created_at desc);

create table if not exists cost_arrival_items (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  arrival_id text not null references cost_arrivals(id) on delete cascade,
  product_id text not null references products(id),
  quantity double precision not null check (quantity > 0),
  -- Prix payé au fournisseur, par unité, dans la devise de l'arrivage.
  unit_price double precision not null default 0,
  -- Poids (kg) et volume (m³) d'UNE unité, pour les règles « au poids » et « au volume ».
  weight double precision,
  volume double precision,
  -- Décoché : le prix d'achat est mis à jour, mais le prix de vente reste celui d'avant.
  apply_sale_price boolean not null default true,
  -- Prix de vente fixé à la main pour cette ligne (sinon : prix conseillé).
  sale_price_override double precision,
  position int not null default 0,
  -- Photographie prise à l'application (sert au retour arrière et à l'historique).
  old_purchase_price double precision,
  old_sale_price double precision,
  old_stock double precision,
  unit_cost double precision,
  new_purchase_price double precision,
  new_sale_price double precision,
  -- Marque la ligne dont le stock est déjà entré : une reprise après erreur ne le double jamais.
  stock_entered_at timestamptz,
  applied_at timestamptz,
  unique (arrival_id, product_id)
);
-- Rattrapage si la table existait déjà sans cette colonne.
alter table cost_arrival_items add column if not exists stock_entered_at timestamptz;
create index if not exists cost_arrival_items_arrival_idx on cost_arrival_items (arrival_id, position);
create index if not exists cost_arrival_items_product_idx on cost_arrival_items (product_id);

create table if not exists cost_arrival_expenses (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  arrival_id text not null references cost_arrivals(id) on delete cascade,
  label text not null,
  amount double precision not null check (amount >= 0),
  rule text not null default 'VALUE' check (rule in ('VALUE', 'WEIGHT', 'QUANTITY', 'VOLUME', 'MANUAL')),
  -- Règle « à la main » : { "<id de la ligne>": montant }.
  manual_shares jsonb,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists cost_arrival_expenses_arrival_idx on cost_arrival_expenses (arrival_id, position);

-- ---------------------------------------------------------------------------
-- Historique des prix : chaque changement, son auteur et sa raison.
-- ---------------------------------------------------------------------------
create table if not exists product_price_history (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  product_id text not null references products(id) on delete cascade,
  arrival_id text references cost_arrivals(id) on delete set null,
  old_purchase_price double precision,
  new_purchase_price double precision,
  old_sale_price double precision,
  new_sale_price double precision,
  stock_at_change double precision,
  reason text not null check (reason in ('ARRIVAGE', 'RETABLI')),
  user_id text references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists product_price_history_product_idx on product_price_history (product_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Isolation par commerce (même principe que les autres tables)
-- ---------------------------------------------------------------------------
alter table cost_arrivals enable row level security;
drop policy if exists zindo_tenant_isolation on cost_arrivals;
create policy zindo_tenant_isolation on cost_arrivals
  using (business_id = zindo_current_business_id())
  with check (business_id = zindo_current_business_id());
grant select, insert, update, delete on cost_arrivals to authenticated;
revoke all on cost_arrivals from anon;

alter table cost_arrival_items enable row level security;
drop policy if exists zindo_tenant_isolation on cost_arrival_items;
create policy zindo_tenant_isolation on cost_arrival_items
  using (business_id = zindo_current_business_id())
  with check (business_id = zindo_current_business_id());
grant select, insert, update, delete on cost_arrival_items to authenticated;
revoke all on cost_arrival_items from anon;

alter table cost_arrival_expenses enable row level security;
drop policy if exists zindo_tenant_isolation on cost_arrival_expenses;
create policy zindo_tenant_isolation on cost_arrival_expenses
  using (business_id = zindo_current_business_id())
  with check (business_id = zindo_current_business_id());
grant select, insert, update, delete on cost_arrival_expenses to authenticated;
revoke all on cost_arrival_expenses from anon;

alter table product_price_history enable row level security;
drop policy if exists zindo_tenant_isolation on product_price_history;
create policy zindo_tenant_isolation on product_price_history
  using (business_id = zindo_current_business_id())
  with check (business_id = zindo_current_business_id());
grant select, insert, update, delete on product_price_history to authenticated;
revoke all on product_price_history from anon;
