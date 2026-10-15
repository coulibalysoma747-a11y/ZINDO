#!/usr/bin/env bash
# Mise à jour du site : récupère le code, compile et redémarre. Usage : sudo bash deploy.sh
set -euo pipefail

APP=/opt/zindo
cd "$APP"
[ -f .env.production ] || { echo "Fichier $APP/.env.production manquant." >&2; exit 1; }

as_zindo() { sudo -u zindo env ELECTRON_SKIP_BINARY_DOWNLOAD=1 NODE_OPTIONS=--max-old-space-size=4096 "$@"; }

as_zindo git pull --ff-only
as_zindo npm ci --no-audit --no-fund
as_zindo npm run build
systemctl restart zindo
echo "ZINDO est à jour."
