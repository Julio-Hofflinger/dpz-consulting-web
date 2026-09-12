#!/usr/bin/env bash
# =============================================================================
# DPZ Consulting — Deploy Script para Servidor OVH (Ubuntu/Debian)
# Uso: chmod +x deploy.sh && sudo ./deploy.sh dpzdata.com
# =============================================================================

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log()   { echo -e "${BLUE}[INFO]${NC} $*"; }
ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()   { echo -e "${RED}[ERR]${NC} $*"; exit 1; }

# -----------------------------------------------------------------------------
# Configuración (edita si es necesario)
# -----------------------------------------------------------------------------
DOMAIN="${1:-dpzdata.com}"
WEB_ROOT="/var/www/${DOMAIN}"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}"
BACKUP_DIR="/var/backups/${DOMAIN}-$(date +%Y%m%d-%H%M%S)"

# -----------------------------------------------------------------------------
# Verificaciones previas
# -----------------------------------------------------------------------------
[[ $EUID -eq 0 ]] || err "Ejecuta como root: sudo ./deploy.sh ${DOMAIN}"
[[ -n "${DOMAIN}" ]] || err "Uso: sudo ./deploy.sh tu-dominio.com"

log "Iniciando deploy para ${DOMAIN}"
log "Web root: ${WEB_ROOT}"

# -----------------------------------------------------------------------------
# 1. Instalar dependencias
# -----------------------------------------------------------------------------
log "Instalando paquetes necesarios..."
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx brotli 2>/dev/null | tail -5

# -----------------------------------------------------------------------------
# 2. Crear directorio web y copiar archivos
# -----------------------------------------------------------------------------
log "Preparando directorio web..."
mkdir -p "${WEB_ROOT}"

# Si ya existe, hacer backup
if [[ -d "${WEB_ROOT}" && "$(ls -A ${WEB_ROOT})" ]]; then
    warn "Directorio no vacío, creando backup en ${BACKUP_DIR}"
    mkdir -p "$(dirname "${BACKUP_DIR}")"
    mv "${WEB_ROOT}" "${BACKUP_DIR}"
    mkdir -p "${WEB_ROOT}"
fi

# Copiar archivos del proyecto (asume que estás en el directorio del proyecto)
log "Copiando archivos del proyecto..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "${SCRIPT_DIR}")"

# Si el script está dentro del proyecto, usar directorio actual
if [[ -f "${PWD}/index.html" ]]; then
    PROJECT_DIR="${PWD}"
fi

rsync -av --delete \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude '*.log' \
    --exclude '*.md' \
    --exclude 'package*.json' \
    --exclude 'deploy.sh' \
    --exclude 'parse-lighthouse.js' \
    --exclude 'lighthouse-report*' \
    --exclude '.claude' \
    --exclude 'Recursos DPZ Consulting' \
    --exclude 'tools' \
    --exclude 'docs' \
    --exclude '_remote_*' \
    --exclude 'index-remote.html' \
    --exclude '*.zip' \
    --exclude '*.bak' \
    --exclude '*.py' \
    --exclude 'null' \
    --exclude 'assets/models/earth_-_16k_high_resolution.glb' \
    "${PROJECT_DIR}/" "${WEB_ROOT}/"

ok "Archivos copiados a ${WEB_ROOT}"

# -----------------------------------------------------------------------------
# 3. Configurar Nginx con optimizaciones de performance
# -----------------------------------------------------------------------------
log "Configurando Nginx..."

cat > "${NGINX_CONF}" <<'NGINX_EOF'
# DPZ Consulting — Nginx Config Optimizado
# Generado automáticamente por deploy.sh

server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_PLACEHOLDER www.DOMAIN_PLACEHOLDER;
    root WEB_ROOT_PLACEHOLDER;
    index index.html;

    # Seguridad básica
    server_tokens off;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain text/css text/xml text/javascript
        application/javascript application/json application/xml application/rss+xml
        application/vnd.ms-fontobject application/x-font-ttf application/x-web-app-manifest+json
        font/opentype font/woff font/woff2 image/svg+xml image/x-icon;

    # Brotli compression (requiere nginx compilado con --with-http_brotli_static_module)
    brotli on;
    brotli_vary on;
    brotli_min_length 1024;
    brotli_comp_level 5;
    brotli_types
        text/plain text/css text/xml text/javascript
        application/javascript application/json application/xml application/rss+xml
        application/vnd.ms-fontobject application/x-font-ttf application/x-web-app-manifest+json
        font/opentype font/woff font/woff2 image/svg+xml image/x-icon;

    # Cache headers para assets versionados (hash en filename)
    location ~* \.(?:js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|webp|avif|json)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        add_header Vary "Accept-Encoding";
    }

    # HTML - no cachear agresivamente
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-cache, must-revalidate";
    }

    # Service Worker (si se añade luego)
    location /sw.js {
        expires -1;
        add_header Cache-Control "no-cache, must-revalidate";
        add_header Service-Worker-Allowed "/";
    }

    # Manifest
    location /site.webmanifest {
        expires 1d;
        add_header Cache-Control "public";
    }

    # Fonts - CORS para CDN
    location ~* \.(?:woff|woff2|ttf|otf|eot)$ {
        add_header Access-Control-Allow-Origin "*";
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback - servir index.html para rutas no encontradas
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Seguridad: denegar archivos ocultos y sensibles
    location ~ /\.(?!well-known) {
        deny all;
        access_log off;
        log_not_found off;
    }
    location ~* \.(?:git|env|log|md)$ {
        deny all;
    }

    # Logs
    access_log /var/log/nginx/DOMAIN_PLACEHOLDER-access.log;
    error_log /var/log/nginx/DOMAIN_PLACEHOLDER-error.log;
}

# Redirect www → non-www (o viceversa, descomenta lo que prefieras)
server {
    listen 80;
    listen [::]:80;
    server_name www.DOMAIN_PLACEHOLDER;
    return 301 https://DOMAIN_PLACEHOLDER$request_uri;
}
NGINX_EOF

# Reemplazar placeholders
sed -i "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" "${NGINX_CONF}"
sed -i "s|WEB_ROOT_PLACEHOLDER|${WEB_ROOT}|g" "${NGINX_CONF}"

# Habilitar sitio
ln -sf "${NGINX_CONF}" "${NGINX_ENABLED}"

# Deshabilitar sitio por defecto
rm -f /etc/nginx/sites-enabled/default

# Test configuración
nginx -t && ok "Configuración Nginx válida" || err "Error en configuración Nginx"

# -----------------------------------------------------------------------------
# 4. Obtener certificado SSL con Let's Encrypt
# -----------------------------------------------------------------------------
log "Obteniendo certificado SSL para ${DOMAIN}..."

# Detener nginx temporalmente para standalone (más fiable)
systemctl stop nginx 2>/dev/null || true

certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "contacto@${DOMAIN}" \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}" \
    --rsa-key-size 4096 \
    2>&1 | tail -10

# Actualizar configuración Nginx para HTTPS
cat > "${NGINX_CONF}" <<'NGINX_SSL_EOF'
# DPZ Consulting — Nginx Config SSL Optimizado

# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_PLACEHOLDER www.DOMAIN_PLACEHOLDER;
    return 301 https://DOMAIN_PLACEHOLDER$request_uri;
}

# HTTPS principal
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name DOMAIN_PLACEHOLDER;
    root WEB_ROOT_PLACEHOLDER;
    index index.html;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/chain.pem;

    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 1.1.1.1 8.8.8.8 valid=300s;
    resolver_timeout 5s;

    # Security Headers
    server_tokens off;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()" always;
    # HSTS (descomenta tras confirmar que todo funciona)
    # add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml application/rss+xml application/vnd.ms-fontobject application/x-font-ttf application/x-web-app-manifest+json font/opentype font/woff font/woff2 image/svg+xml image/x-icon;

    # Brotli
    brotli on;
    brotli_vary on;
    brotli_min_length 1024;
    brotli_comp_level 5;
    brotli_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml application/rss+xml application/vnd.ms-fontobject application/x-font-ttf application/x-web-app-manifest+json font/opentype font/woff font/woff2 image/svg+xml image/x-icon;

    # Cache para assets versionados
    location ~* \.(?:js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|webp|avif|json)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        add_header Vary "Accept-Encoding";
    }

    # HTML - no cache agresivo
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-cache, must-revalidate";
    }

    # Service Worker
    location /sw.js {
        expires -1;
        add_header Cache-Control "no-cache, must-revalidate";
        add_header Service-Worker-Allowed "/";
    }

    # Manifest
    location /site.webmanifest {
        expires 1d;
        add_header Cache-Control "public";
    }

    # Fonts CORS
    location ~* \.(?:woff|woff2|ttf|otf|eot)$ {
        add_header Access-Control-Allow-Origin "*";
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Denegar archivos sensibles
    location ~ /\.(?!well-known) { deny all; access_log off; log_not_found off; }
    location ~* \.(?:git|env|log|md)$ { deny all; }

    # Logs
    access_log /var/log/nginx/DOMAIN_PLACEHOLDER-access.log;
    error_log /var/log/nginx/DOMAIN_PLACEHOLDER-error.log;
}

# www → non-www
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.DOMAIN_PLACEHOLDER;
    ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;
    return 301 https://DOMAIN_PLACEHOLDER$request_uri;
}
NGINX_SSL_EOF

sed -i "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" "${NGINX_CONF}"
sed -i "s|WEB_ROOT_PLACEHOLDER|${WEB_ROOT}|g" "${NGINX_CONF}"

# Test y reiniciar nginx
nginx -t && ok "Configuración SSL válida" || err "Error en configuración SSL"
systemctl restart nginx
systemctl enable nginx

ok "Nginx configurado y reiniciado con SSL"

# -----------------------------------------------------------------------------
# 5. Configurar renovación automática de certificados
# -----------------------------------------------------------------------------
log "Configurando renovación automática SSL..."
cat > /etc/cron.d/certbot-renew <<'CRON_EOF'
# Renovación automática Let's Encrypt (2x día)
0 */12 * * * root certbot renew --quiet --post-hook "systemctl reload nginx"
CRON_EOF

ok "Renovación automática configurada"

# -----------------------------------------------------------------------------
# 6. Configurar firewall (UFW)
# -----------------------------------------------------------------------------
log "Configurando firewall..."
ufw allow 'Nginx Full' 2>/dev/null || true
ufw allow OpenSSH 2>/dev/null || true
ufw --force enable 2>/dev/null || true
ok "Firewall configurado"

# -----------------------------------------------------------------------------
# 7. Verificación final
# -----------------------------------------------------------------------------
log "Verificando deploy..."
sleep 2

# Health check
if curl -sf -o /dev/null -w "%{http_code}" "https://${DOMAIN}" | grep -q "200"; then
    ok "Sitio responde correctamente (HTTPS 200)"
else
    warn "Verificación HTTPS falló - revisa DNS y certificados"
fi

# Verificar headers de compresión
if curl -sI -H "Accept-Encoding: gzip, br" "https://${DOMAIN}" | grep -qi "content-encoding: br"; then
    ok "Compresión Brotli activa"
elif curl -sI -H "Accept-Encoding: gzip" "https://${DOMAIN}" | grep -qi "content-encoding: gzip"; then
    ok "Compresión Gzip activa"
else
    warn "Compresión no detectada"
fi

# Verificar cache headers
if curl -sI "https://${DOMAIN}/assets/css/style.css?v=8" | grep -qi "cache-control: public, immutable"; then
    ok "Cache headers correctos para assets"
else
    warn "Cache headers no detectados en assets"
fi

# -----------------------------------------------------------------------------
# Resumen final
# -----------------------------------------------------------------------------
echo
echo "=========================================="
echo -e "${GREEN}✅ DEPLOY COMPLETADO PARA ${DOMAIN}${NC}"
echo "=========================================="
echo
echo "📁 Web root:     ${WEB_ROOT}"
echo "🔧 Nginx config: ${NGINX_CONF}"
echo "🔒 SSL certs:    /etc/letsencrypt/live/${DOMAIN}/"
echo "📋 Logs:         /var/log/nginx/${DOMAIN}-*.log"
echo "🔄 Renovación:   /etc/cron.d/certbot-renew"
echo
echo "🌐 URLs:"
echo "   https://${DOMAIN}"
echo "   https://www.${DOMAIN} (redirige a sin www)"
echo
echo "📋 Próximos pasos:"
echo "   1. Verifica en https://pagespeed.web.dev/analysis?url=https://${DOMAIN}"
echo "   2. Revisa Core Web Vitals en Search Console"
echo "   3. Si todo OK, descomenta HSTS en ${NGINX_CONF} y recarga nginx"
echo
echo "🛠 Comandos útiles:"
echo "   sudo systemctl reload nginx     # Recargar config"
echo "   sudo nginx -t                   # Test config"
echo "   sudo certbot renew --dry-run    # Test renovación SSL"
echo "   tail -f /var/log/nginx/${DOMAIN}-access.log  # Ver logs"
echo
ok "¡Listo para producción!"