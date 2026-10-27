-- Connexion rapide : code PIN et Face ID / empreinte (clés d'accès WebAuthn).
-- Idempotent : peut être relancé sans danger. À coller dans l'éditeur SQL de Supabase.

-- Code PIN (4 chiffres, haché comme le mot de passe) et son compteur d'échecs.
alter table users add column if not exists pin_hash text;
alter table users add column if not exists pin_failed_attempts int not null default 0;
alter table users add column if not exists pin_failed_at timestamptz;

-- Appareils sur lesquels un employé a activé son PIN. Le navigateur garde un jeton
-- secret (cookie) ; seule son empreinte est enregistrée ici.
create table if not exists trusted_devices (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references users(id) on delete cascade,
  token_hash text not null,
  label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  unique (token_hash, user_id)
);
create index if not exists trusted_devices_token_idx on trusted_devices (token_hash);

-- Clés d'accès (Face ID, empreinte, Windows Hello). Aucune donnée biométrique n'est
-- envoyée à ZINDO : on ne garde que la clé publique de l'appareil.
create table if not exists passkeys (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references users(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  transports text,
  label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists passkeys_user_idx on passkeys (user_id);

-- Accessibles uniquement par le serveur de ZINDO (clé de service) : aucune politique.
alter table trusted_devices enable row level security;
alter table passkeys enable row level security;
