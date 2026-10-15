#!/usr/bin/env bash
# Appelle une route /api/cron/* avec le secret CRON_SECRET (comme le faisait Vercel).
# Usage : cron.sh /api/cron/purge-corbeille
set -euo pipefail

secret="$(grep -m1 '^CRON_SECRET=' /opt/zindo/.env.production | cut -d= -f2- | tr -d '"')"
curl -fsS -m 300 -H "Authorization: Bearer $secret" "http://127.0.0.1:3000$1" >/dev/null
