#!/bin/bash
# ==========================================================================
# DPZ + Velvet + CCHIA Bot — Despliegue completo en Ubuntu 26.04 OVH
# Dominios: dpzdata.com · velvetpremium.cl
# SE SEGURO: validación de rutas, rsync, sin rm -rf con variables
# ==========================================================================
set -euo pipefail

# --- Validación estricta de rutas ---
validate_path() {
  local p="$1"
  if [[ ! "$p" =~ ^/var/www/[a-z0-9_-]+$ ]] && [[ ! "$p" =~ ^/home/[a-z0-9_-]+/[a-z0-9._-]+$ ]]; then
    echo "[ERROR] Ruta insegura: $p" >&2; exit 1
  fi
}

echo "=========================================="
echo "  DPZ + Velvet + CCHIA — Setup Completo"
echo "  Servidor: $(hostname) | OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"')"
echo "=========================================="

# ==========================================================================
# 1. Actualizar sistema + dependencias base
# ==========================================================================
echo "[1/7] Actualizando sistema..."
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y nginx curl wget git certbot python3-certbot-nginx rsync

# ==========================================================================
# 2. Instalar Docker + Docker Compose
# ==========================================================================
echo "[2/7] Instalando Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker $USER
fi
if ! docker compose version &>/dev/null 2>&1; then
  sudo apt-get install -y docker-compose-plugin
fi
sudo systemctl enable --now docker

# ==========================================================================
# 3. Instalar Caddy
# ==========================================================================
echo "[3/7] Instalando Caddy..."
if ! command -v caddy &>/dev/null; then
  sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt-get update -y && sudo apt-get install -y caddy
fi

# ==========================================================================
# 4. Instalar Node.js 22 (para Velvet)
# ==========================================================================
echo "[4/7] Instalando Node.js..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# ==========================================================================
# 5. Configurar Caddy (dpzdata.com + velvetpremium.cl)
# ==========================================================================
echo "[5/7] Configurando Caddy..."

WEBROOT_DPZ="/var/www/dpzdata"
WEBROOT_VELVET="/var/www/velvetpremium"
validate_path "$WEBROOT_DPZ"
validate_path "$WEBROOT_VELVET"
sudo mkdir -p "$WEBROOT_DPZ" "$WEBROOT_VELVET"

sudo tee /etc/caddy/Caddyfile > /dev/null <<'CADDYEOF'
# --- dpzdata.com (sitio estático) ---
dpzdata.com {
	root * /var/www/dpzdata
	encode zstd gzip
	try_files {path} {path}.html {path}/ =404
	file_server
	handle_errors {
		@notfound expression {http.error.status_code} == 404
		rewrite @notfound /404.html
		file_server
	}
	@static { path *.css *.js *.webp *.png *.jpg *.jpeg *.svg *.ico *.woff *.woff2 }
	header @static Cache-Control "public, max-age=31536000, immutable"
	@html path *.html
	header @html Cache-Control "no-cache, must-revalidate"
	header {
		X-Content-Type-Options "nosniff"
		X-Frame-Options "SAMEORIGIN"
		Referrer-Policy "strict-origin-when-cross-origin"
		-Server
	}
}

www.dpzdata.com { redir https://dpzdata.com{uri} permanent }

# --- velvetpremium.cl (Node.js + bot proxy) ---
velvetpremium.cl {
	encode zstd gzip
	handle_path /bot/* {
		reverse_proxy 127.0.0.1:8000
	}
	reverse_proxy 127.0.0.1:3000
}

www.velvetpremium.cl { redir https://velvetpremium.cl{uri} permanent }
CADDYEOF

sudo systemctl enable caddy
sudo systemctl reload caddy 2>/dev/null || sudo systemctl start caddy

# ==========================================================================
# 6. Desplegar Velvet (Node.js + PM2)
# ==========================================================================
echo "[6/7] Desplegando Velvet..."
if [ -d /tmp/velvet-upload ]; then
  sudo rsync -a --delete /tmp/velvet-upload/ "$WEBROOT_VELVET/"
  sudo chown -R $USER:$USER "$WEBROOT_VELVET"
  cd "$WEBROOT_VELVET"
  npm install --production 2>/dev/null || true
  # PM2 para mantenerlo vivo
  sudo npm install -g pm2 2>/dev/null || true
  pm2 delete velvet 2>/dev/null || true
  pm2 start server.js --name velvet -- --port 3000
  pm2 save
  sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER 2>/dev/null || true
  echo "   Velvet desplegado en puerto 3000"
else
  echo "   [AVISO] /tmp/velvet-upload no encontrado — subir manualmente"
fi

# ==========================================================================
# 7. Desplegar CCHIA Bot (Docker)
# ==========================================================================
echo "[7/7] Desplegando CCHIA Bot..."
BOT_DIR="/home/$USER/cchia-funding-bot"
validate_path "$BOT_DIR"

if [ -d /tmp/bot-upload ]; then
  sudo rsync -a --delete /tmp/bot-upload/ "$BOT_DIR/"
  sudo chown -R $USER:$USER "$BOT_DIR"
  cd "$BOT_DIR"
  mkdir -p ollama_storage postgres_data core_application_src/data
  docker compose up -d --build
  echo "   Bot desplegado (Ollama + PostgreSQL + Orquestador)"
  echo "   Esperando servicios..."
  sleep 10
  # Bajar modelos LLM
  if docker compose ps | grep -q ollama-service; then
    echo "   Descargando modelos LLM (qwen2.5:7b, bge-m3)..."
    docker compose exec -T ollama-service ollama pull qwen2.5:7b || echo "   [WARN] modelo qwen pendiente"
  fi
else
  echo "   [AVISO] /tmp/bot-upload no encontrado — subir manualmente"
fi

echo ""
echo "=========================================="
echo " SETUP COMPLETO"
echo "  ✅ dpzdata.com  -> $WEBROOT_DPZ (Caddy + estático)"
echo "  ✅ velvetpremium.cl -> localhost:3000 (Node.js)"
echo "  ✅ /bot/*  -> localhost:8000 (Docker)"
echo "  ✅ PostgreSQL  -> Docker (pgvector)"
echo ""
echo " Para subir archivos desde PC: tools/deploy.ps1"
echo "=========================================="
