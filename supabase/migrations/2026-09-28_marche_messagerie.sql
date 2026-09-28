-- Messagerie du Marché : une conversation par acheteur et par boutique.
create table if not exists market_conversations (
  id text primary key default gen_random_uuid()::text,
  buyer_id text not null references market_buyers(id) on delete cascade,
  shop_id text not null references market_shops(id) on delete cascade,
  business_id text not null references businesses(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  buyer_unread int not null default 0,
  seller_unread int not null default 0,
  created_at timestamptz not null default now(),
  unique (buyer_id, shop_id)
);
create index if not exists market_conversations_business_idx on market_conversations (business_id, last_message_at desc);
create index if not exists market_conversations_buyer_idx on market_conversations (buyer_id, last_message_at desc);

create table if not exists market_messages (
  id text primary key default gen_random_uuid()::text,
  conversation_id text not null references market_conversations(id) on delete cascade,
  sender text not null check (sender in ('BUYER', 'SELLER')),
  body text check (char_length(body) <= 2000),
  photo_url text,
  listing_id text references market_listings(id) on delete set null,
  order_id text references market_orders(id) on delete set null,
  created_at timestamptz not null default now(),
  check (body is not null or photo_url is not null or listing_id is not null or order_id is not null)
);
create index if not exists market_messages_conversation_idx on market_messages (conversation_id, created_at);

-- Envoi atomique : message + aperçu + compteur « non lu » de l'autre partie.
create or replace function market_send_message(p_conversation text, p_sender text, p_body text, p_photo text, p_listing text, p_order text)
returns text language plpgsql security definer set search_path = public as $$
declare v_id text;
begin
  insert into market_messages (conversation_id, sender, body, photo_url, listing_id, order_id)
    values (p_conversation, p_sender, nullif(trim(p_body), ''), p_photo, p_listing, p_order) returning id into v_id;
  update market_conversations set
    last_message_at = now(),
    last_message_preview = left(coalesce(nullif(trim(p_body), ''), case when p_photo is not null then '📷 Photo' when p_order is not null then '📦 Commande' else '🛍️ Produit' end), 120),
    buyer_unread = buyer_unread + case when p_sender = 'SELLER' then 1 else 0 end,
    seller_unread = seller_unread + case when p_sender = 'BUYER' then 1 else 0 end
  where id = p_conversation;
  return v_id;
end $$;
revoke all on function market_send_message(text, text, text, text, text, text) from public, anon, authenticated;

alter table market_conversations enable row level security;
alter table market_messages enable row level security;
