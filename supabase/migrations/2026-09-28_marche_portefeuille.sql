-- Portefeuille ZINDO et mises en avant payantes du Marché (choix du propriétaire, 28/09) :
-- le vendeur recharge son portefeuille (Mobile Money vers ZINDO, validé une fois dans
-- l'admin), puis paie ses mises en avant instantanément depuis son solde.

create table if not exists market_wallets (
  business_id text primary key references businesses(id) on delete cascade,
  balance int not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists market_wallet_transactions (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  kind text not null check (kind in ('RECHARGE', 'BOOST_PRODUIT', 'BOOST_BOUTIQUE', 'AJUSTEMENT')),
  amount int not null,
  balance_after int not null,
  details text,
  created_at timestamptz not null default now()
);
create index if not exists market_wallet_transactions_business_idx on market_wallet_transactions (business_id, created_at desc);

create table if not exists market_topups (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  amount int not null check (amount >= 100),
  operator text not null check (operator in ('ORANGE', 'MOOV')),
  reference text not null,
  status text not null default 'EN_ATTENTE' check (status in ('EN_ATTENTE', 'VALIDEE', 'REFUSEE')),
  reject_reason text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);
create index if not exists market_topups_status_idx on market_topups (status, submitted_at desc);
-- Une même référence de transfert ne peut pas être déclarée deux fois.
create unique index if not exists market_topups_reference_uq on market_topups (lower(reference));

-- Tarifs modifiables dans l'administration (valeurs du cahier des charges).
create table if not exists market_boost_prices (
  kind text not null check (kind in ('PRODUIT', 'BOUTIQUE')),
  days int not null check (days > 0),
  price int not null check (price >= 0),
  active boolean not null default true,
  primary key (kind, days)
);
insert into market_boost_prices (kind, days, price) values
  ('PRODUIT', 1, 100), ('PRODUIT', 3, 250), ('PRODUIT', 7, 500), ('PRODUIT', 15, 900), ('PRODUIT', 30, 1500),
  ('BOUTIQUE', 7, 1000), ('BOUTIQUE', 15, 1500), ('BOUTIQUE', 30, 2500)
on conflict (kind, days) do nothing;

create table if not exists market_boosts (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  kind text not null check (kind in ('PRODUIT', 'BOUTIQUE')),
  listing_id text references market_listings(id) on delete cascade,
  shop_id text references market_shops(id) on delete cascade,
  days int not null,
  price int not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check ((kind = 'PRODUIT' and listing_id is not null) or (kind = 'BOUTIQUE' and shop_id is not null))
);
create index if not exists market_boosts_active_idx on market_boosts (kind, ends_at);

-- Validation d'une recharge : crédite le portefeuille une seule fois (verrou sur la recharge).
create or replace function market_validate_topup(p_topup_id text, p_admin text)
returns int language plpgsql security definer set search_path = public as $$
declare v_topup market_topups%rowtype; v_balance int;
begin
  select * into v_topup from market_topups where id = p_topup_id for update;
  if not found then raise exception 'RECHARGE_INTROUVABLE'; end if;
  if v_topup.status <> 'EN_ATTENTE' then raise exception 'RECHARGE_DEJA_TRAITEE'; end if;
  update market_topups set status = 'VALIDEE', reviewed_at = now(), reviewed_by = p_admin where id = p_topup_id;
  insert into market_wallets (business_id, balance) values (v_topup.business_id, v_topup.amount)
    on conflict (business_id) do update set balance = market_wallets.balance + v_topup.amount, updated_at = now()
    returning balance into v_balance;
  insert into market_wallet_transactions (business_id, kind, amount, balance_after, details)
    values (v_topup.business_id, 'RECHARGE', v_topup.amount, v_balance, 'Recharge ' || v_topup.operator || ' · réf. ' || v_topup.reference);
  return v_balance;
end $$;

-- Achat d'une mise en avant : prix lu dans les tarifs, solde vérifié et débité en une
-- seule opération (verrou sur le portefeuille) ; prolonge une mise en avant encore active.
create or replace function market_buy_boost(p_business text, p_kind text, p_target text, p_days int)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_price int; v_balance int; v_start timestamptz; v_end timestamptz; v_label text;
begin
  select price into v_price from market_boost_prices where kind = p_kind and days = p_days and active;
  if v_price is null then raise exception 'TARIF_INTROUVABLE'; end if;
  if p_kind = 'PRODUIT' then
    select p.name into v_label from market_listings l join products p on p.id = l.product_id
      where l.id = p_target and l.business_id = p_business and l.published and not l.removed_by_admin;
  else
    select name into v_label from market_shops where id = p_target and business_id = p_business and published and not suspended;
  end if;
  if v_label is null then raise exception 'CIBLE_INTROUVABLE'; end if;

  select balance into v_balance from market_wallets where business_id = p_business for update;
  if v_balance is null or v_balance < v_price then raise exception 'SOLDE_INSUFFISANT'; end if;
  update market_wallets set balance = balance - v_price, updated_at = now() where business_id = p_business returning balance into v_balance;

  select greatest(now(), coalesce(max(ends_at), now())) into v_start from market_boosts
    where kind = p_kind and (listing_id = p_target or shop_id = p_target) and ends_at > now();
  v_start := coalesce(v_start, now());
  v_end := v_start + make_interval(days => p_days);
  insert into market_boosts (business_id, kind, listing_id, shop_id, days, price, starts_at, ends_at)
    values (p_business, p_kind, case when p_kind = 'PRODUIT' then p_target end, case when p_kind = 'BOUTIQUE' then p_target end, p_days, v_price, v_start, v_end);
  insert into market_wallet_transactions (business_id, kind, amount, balance_after, details)
    values (p_business, case when p_kind = 'PRODUIT' then 'BOOST_PRODUIT' else 'BOOST_BOUTIQUE' end, -v_price, v_balance,
            'Mise en avant ' || p_days || ' j · ' || v_label);
  return v_end;
end $$;

revoke all on function market_validate_topup(text, text) from public, anon, authenticated;
revoke all on function market_buy_boost(text, text, text, int) from public, anon, authenticated;

alter table market_wallets enable row level security;
alter table market_wallet_transactions enable row level security;
alter table market_topups enable row level security;
alter table market_boost_prices enable row level security;
alter table market_boosts enable row level security;
