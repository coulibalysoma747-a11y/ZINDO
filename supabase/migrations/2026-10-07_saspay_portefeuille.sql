-- SasPay : recharge du portefeuille du Marché et Pack Vérifié. Idempotent : peut être relancé sans danger.

-- Les recharges payées en ligne sont notées « SASPAY ».
alter table market_topups drop constraint if exists market_topups_operator_check;
alter table market_topups add constraint market_topups_operator_check check (operator in ('ORANGE', 'MOOV', 'SASPAY'));

-- Pack Vérifié : un paiement reçu mais pas encore utilisé (première demande) reste « disponible » tant que used_at est vide.
alter table saspay_payments add column if not exists used_at timestamptz;
