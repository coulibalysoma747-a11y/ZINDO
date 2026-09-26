-- Retour partiel / échange d'articles (flag retour_partiel) — voir
-- lib/actions/sale-returns.ts.
--
-- Un retour est enregistré comme une vente « miroir » en montants négatifs
-- (document_type = 'RETOUR'), rattachée à la vente d'origine par cette
-- colonne. Ainsi le chiffre d'affaires, la caisse du jour et les rapports,
-- qui additionnent les ventes, déduisent le retour d'eux-mêmes.
alter table sales add column if not exists return_of_sale_id text references sales(id);
create index if not exists sales_return_of_sale_id_idx on sales (return_of_sale_id) where return_of_sale_id is not null;
