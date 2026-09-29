-- Monnaie d'une commande du Marché (celle de la boutique au moment de la commande).
alter table market_orders add column if not exists currency text not null default 'XOF';
