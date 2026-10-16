#!/usr/bin/env bash
# Prépare le fichier d'environnement du serveur Oracle (sans rien afficher).
# Usage : bash make-env.sh fichier-de-sortie
# Sources : .env.production, puis les clés absentes de .env.local, puis deploy/oracle/.env.extra
# (DATABASE_URL, etc. — fichier ignoré par git). Les variables propres à Vercel sont retirées.
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
out="${1:?Usage : bash make-env.sh fichier-de-sortie}"
: > "$out"

for src in "$root/.env.production" "$root/.env.local" "$root/deploy/oracle/.env.extra"; do
  [ -f "$src" ] || continue
  while IFS= read -r line || [ -n "$line" ]; do
    key="${line%%=*}"
    [[ "$line" =~ ^[A-Z0-9_]+= ]] || continue
    # SUPABASE_ACCESS_TOKEN : jeton révoqué et inutile au site, donc inutile de le confier à l'hébergeur
    case "$key" in VERCEL*|TURBO*|NX_DAEMON|SUPABASE_ACCESS_TOKEN) continue ;; esac
    [[ "$line" =~ ^[A-Z0-9_]+=(\"\")?$ ]] && continue
    # Vercel remplace ses variables sensibles par « [SENSITIVE] » : ce n'est pas une vraie valeur
    case "$line" in *'[SENSITIVE]'*) continue ;; esac
    # Une clé déjà présente n'est remplacée que par le fichier « extra »
    if grep -q "^$key=" "$out"; then
      [ "$src" = "$root/deploy/oracle/.env.extra" ] || continue
      grep -v "^$key=" "$out" > "$out.tmp" && mv "$out.tmp" "$out"
    fi
    printf '%s\n' "$line" >> "$out"
  done < "$src"
done

# Le secret de session de développement est devinable : on le remplace par un secret aléatoire
# (les utilisateurs devront simplement se reconnecter une fois).
if grep -q '^SESSION_SECRET=.*dev-secret' "$out" || ! grep -q '^SESSION_SECRET=' "$out"; then
  grep -v '^SESSION_SECRET=' "$out" > "$out.tmp" && mv "$out.tmp" "$out"
  printf 'SESSION_SECRET="%s"\n' "$(node -p 'require("crypto").randomBytes(32).toString("hex")')" >> "$out"
fi

# Le secret des tâches planifiées peut être recréé : c'est nous qui appelons les routes
grep -q '^CRON_SECRET=' "$out" || printf 'CRON_SECRET="%s"\n' "$(node -p 'require("crypto").randomBytes(24).toString("hex")')" >> "$out"

printf 'Variables écrites : %s\n' "$(grep -c '' "$out")"
for needed in DATABASE_URL SESSION_SECRET SUPABASE_SERVICE_ROLE_KEY RESEND_API_KEY EMAIL_FROM; do
  grep -q "^$needed=" "$out" || echo "ATTENTION : $needed manquant"
done
