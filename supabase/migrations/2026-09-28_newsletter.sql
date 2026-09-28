-- Inscriptions à la newsletter (pied de page complet de l'accueil, flag pied_page_complet).
create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- Écrite uniquement côté serveur (clé service) : aucune politique publique.
alter table newsletter_subscribers enable row level security;
