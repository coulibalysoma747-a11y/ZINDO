-- SasPay : suivi des paiements en ligne (abonnement d'abord). Idempotent : peut être relancé sans danger.
create table if not exists saspay_payments (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  -- Ce que le paiement règle : 'ABONNEMENT' (facture d'abonnement) ; d'autres parcours viendront.
  purpose text not null,
  target_id text not null,
  -- Identifiant de la session de paiement chez SasPay.
  saspay_id text not null unique,
  amount double precision not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'PAID', 'FAILED')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists saspay_payments_pending_idx on saspay_payments (status, created_at desc);

alter table saspay_payments enable row level security;
drop policy if exists zindo_tenant_isolation on saspay_payments;
create policy zindo_tenant_isolation on saspay_payments
  using (business_id = zindo_current_business_id())
  with check (business_id = zindo_current_business_id());
grant select, insert, update, delete on saspay_payments to authenticated;
revoke all on saspay_payments from anon;

-- Étiquette « SasPay » sur les factures payées (sans cela, elles sont notées « Manuel » avec la référence saspay:…).
alter type invoice_payment_method add value if not exists 'SASPAY';
