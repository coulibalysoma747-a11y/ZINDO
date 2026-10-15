#!/usr/bin/env bash
# Installation unique du serveur ZINDO (Ubuntu 22.04/24.04, Oracle Cloud Always Free).
# Usage : sudo bash setup.sh www.zindo.site zindo.site
#   1er domaine = adresse principale ; les suivants redirigent vers elle.
# Prérequis : le fichier /opt/zindo/.env.production doit être envoyé avant le premier démarrage.
set -euo pipefail

DOMAIN="${1:?Usage : sudo bash setup.sh domaine-principal [autre-domaine...]}"
shift || true
APP=/opt/zindo
REPO=https://github.com/coulibalysoma747-a11y/ZINDO.git

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git cron gpg debian-keyring debian-archive-keyring apt-transport-https iptables-persistent

# Mémoire d'appoint pour la compilation de Next.js
if ! swapon --show | grep -q .; then
  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Node.js 24
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 24 ]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi

# Caddy (HTTPS automatique)
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
fi

# Pare-feu Oracle (Ubuntu) : ouvrir les ports 80 et 443
for port in 80 443; do
  iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p tcp --dport "$port" -j ACCEPT
done
netfilter-persistent save

# Utilisateur et code
id zindo >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin zindo
mkdir -p "$APP" && chown zindo:zindo "$APP"
[ -d "$APP/.git" ] || sudo -u zindo git clone "$REPO" "$APP"

# Caddy : le domaine principal sert le site, les autres redirigent
{
  echo "$DOMAIN {"
  echo "  encode zstd gzip"
  echo "  reverse_proxy 127.0.0.1:3000"
  echo "}"
  for other in "$@"; do
    echo "$other {"
    echo "  redir https://$DOMAIN{uri} permanent"
    echo "}"
  done
} > /etc/caddy/Caddyfile

# Service ZINDO
cat > /etc/systemd/system/zindo.service <<'UNIT'
[Unit]
Description=ZINDO (Next.js)
After=network.target

[Service]
User=zindo
WorkingDirectory=/opt/zindo
Environment=NODE_ENV=production
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

# Tâches planifiées (équivalent des crons Vercel, heure UTC)
cat > /etc/cron.d/zindo <<'CRON'
0 3 * * * zindo bash /opt/zindo/deploy/oracle/cron.sh /api/cron/faso-stock-sync
30 3 * * * zindo bash /opt/zindo/deploy/oracle/cron.sh /api/cron/purge-corbeille
CRON
chmod 644 /etc/cron.d/zindo

systemctl daemon-reload
systemctl enable zindo
systemctl reload caddy 2>/dev/null || systemctl restart caddy
echo "Installation terminée. Envoyez .env.production dans $APP puis lancez : sudo bash $APP/deploy/oracle/deploy.sh"
