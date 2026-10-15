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
    case "$key" in VERCEL*|TURBO*|NX_DAEMON) continue ;; esac
    # Une clé déjà présente n'est remplacée que par le fichier « extra »
    if grep -q "^$key=" "$out"; then
      [ "$src" = "$root/deploy/oracle/.env.extra" ] || continue
      grep -v "^$key=" "$out" > "$out.tmp" && mv "$out.tmp" "$out"
    fi
    printf '%s\n' "$line" >> "$out"
  done < "$src"
done

printf 'Variables écrites : %s\n' "$(grep -c '' "$out")"
for needed in DATABASE_URL SESSION_SECRET CRON_SECRET SUPABASE_SERVICE_ROLE_KEY; do
  grep -q "^$needed=" "$out" || echo "ATTENTION : $needed manquant"
done
