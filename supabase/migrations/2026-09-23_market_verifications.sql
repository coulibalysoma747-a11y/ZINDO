-- Vérification des vendeurs du Marché ZINDO : le commerçant envoie depuis
-- l'application la photo de sa pièce d'identité (recto + verso) et une photo
-- de lui (selfie) ; un administrateur ZINDO valide ou refuse depuis
-- /admin/verifications. Validation = badge « Vérifié » sur le marché
-- (feature flag marche_verifie activé pour ce commerce).
--
-- Documents sensibles : bucket de stockage PRIVÉ (jamais d'URL publique,
-- l'admin les consulte via des liens signés temporaires) et table sous RLS
-- sans aucune policy (accessible uniquement avec la clé service du serveur).
--
-- Additif et idempotent. À exécuter dans l'éditeur SQL de Supabase.

create table if not exists market_verifications (
  id text primary key default gen_random_uuid()::text,
  business_id text not null unique references businesses(id) on delete cascade,
  status text not null default 'EN_ATTENTE' check (status in ('EN_ATTENTE', 'VALIDEE', 'REFUSEE')),
  id_front_path text not null,
  id_back_path text not null,
  selfie_path text not null,
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

create index if not exists market_verifications_status_idx on market_verifications (status, submitted_at);

alter table market_verifications enable row level security;

insert into storage.buckets (id, name, public)
values ('verifications', 'verifications', false)
on conflict (id) do update set public = false;
