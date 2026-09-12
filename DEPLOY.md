# DPZ Consulting — Guía de Deploy a Producción

## 📋 Requisitos del Servidor

- **OS**: Ubuntu 22.04 LTS / 24.04 LTS
- **RAM**: ≥ 2 GB (recomendado 4 GB para build + nginx)
- **CPU**: ≥ 2 vCPUs
- **Disco**: ≥ 10 GB libres
- **Dominio**: `dpzdata.com` apuntando al IP del servidor (A/AAAA records)

## 🚀 Deploy Rápido (Script Automático)

```bash
# 1. Subir archivos al servidor
scp -r ./* usuario@tu-servidor:/home/usuario/dpz-web/

# 2. Ejecutar script de deploy (requiere sudo)
ssh usuario@tu-servidor
cd /home/usuario/dpz-web
sudo bash deploy.sh dpzdata.com
```

El script hace todo automáticamente:
- ✅ Instala nginx, certbot, python3
- ✅ Configura nginx con SSL (Let's Encrypt)
- ✅ Headers de seguridad (HSTS, CSP, etc.)
- ✅ Compresión Brotli + Gzip
- ✅ Cache headers optimizados
- ✅ Renovación automática SSL (cron)
- ✅ Firewall UFW

## 🔧 Deploy Manual (Paso a Paso)

### 1. Preparar servidor
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx certbot python3-certbot-nginx brotli
```

### 2. Configurar nginx
```bash
sudo cp nginx.conf /etc/nginx/sites-available/dpzdata.com
sudo ln -s /etc/nginx/sites-available/dpzdata.com /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### 3. Obtener certificado SSL
```bash
sudo certbot --nginx -d dpzdata.com -d www.dpzdata.com --rsa-key-size 4096
```

### 4. Configurar renovación automática
```bash
echo "0 */12 * * * root certbot renew --quiet --post-hook 'systemctl reload nginx'" | sudo tee /etc/cron.d/certbot-renew
```

### 5. Subir archivos web
```bash
sudo mkdir -p /var/www/dpzdata.com
sudo cp -r * /var/www/dpzdata.com/
sudo chown -R www-data:www-data /var/www/dpzdata.com
sudo chmod -R 755 /var/www/dpzdata.com
```

## 📊 Verificación Post-Deploy

### Core Web Vitals (Lighthouse)
```bash
# Local
npx lighthouse https://dpzdata.com --view

# Online
# https://pagespeed.web.dev/analysis?url=https://dpzdata.com
```

**Objetivos:**
| Métrica | Target |
|---------|--------|
| Performance | ≥ 90 |
| Accessibility | ≥ 95 |
| Best Practices | ≥ 90 |
| SEO | ≥ 95 |
| LCP | ≤ 2.5s |
| INP | ≤ 200ms |
| CLS | ≤ 0.1 |

### Headers de respuesta
```bash
# Verificar compresión
curl -sI -H "Accept-Encoding: br" https://dpzdata.com | grep -i content-encoding

# Verificar cache assets
curl -sI https://dpzdata.com/assets/css/style.css?v=8 | grep -i cache-control

# Verificar seguridad
curl -sI https://dpzdata.com | grep -iE "x-frame|x-content|referrer|permissions|strict"
```

### Health checks
```bash
# HTTP 200
curl -sf -o /dev/null -w "%{http_code}" https://dpzdata.com

# SSL válido
curl -sI https://dpzdata.com | grep -i "strict-transport"

# Renovación SSL
sudo certbot renew --dry-run
```

## 🔄 Comandos de Mantenimiento

```bash
# Recargar nginx sin downtime
sudo systemctl reload nginx

# Test configuración
sudo nginx -t

# Ver logs en tiempo real
sudo tail -f /var/log/nginx/dpzdata.com-access.log
sudo tail -f /var/log/nginx/dpzdata.com-error.log

# Renovar SSL manualmente
sudo certbot renew

# Ver estado certificados
sudo certbot certificates

# Backup configuración
sudo tar -czf ~/nginx-backup-$(date +%F).tar.gz /etc/nginx/sites-available/dpzdata.com /etc/letsencrypt/live/dpzdata.com/
```

## 🛡 Hardening Adicional (Opcional)

### CSP (Content Security Policy)
```nginx
# En server block HTTPS, descomenta y ajusta:
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://formspree.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://formspree.io;" always;
```

### Fail2Ban para nginx
```bash
sudo apt install fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
# Editar jail.local, habilitar [nginx-http-auth], [nginx-limit-req], [nginx-botsearch]
sudo systemctl restart fail2ban
```

### Rate Limiting
```nginx
# En http block
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

# En location / (o específico)
limit_req zone=api burst=20 nodelay;
```

## 📁 Estructura de Archivos en Servidor

```
/var/www/dpzdata.com/
├── index.html
├── servicios.html
├── nosotros.html
├── blog.html
├── contacto.html
├── assets/
│   ├── css/style.css?v=8
│   ├── js/main.js?v=2
│   ├── js/hero-3d-premium.js
│   ├── js/hero-3d-lazy.js
│   ├── js/page-particles.js
│   ├── img/
│   └── fonts/
├── site.webmanifest
└── robots.txt
```

## 🚨 Troubleshooting Común

| Problema | Solución |
|----------|----------|
| `502 Bad Gateway` | Verificar que nginx apunta al root correcto |
| `SSL_ERROR_BAD_CERT_DOMAIN` | Verificar DNS A/AAAA records y `certbot certificates` |
| `Mixed Content` | Forzar HTTPS en nginx, revisar `http://` hardcoded en HTML/JS |
| `CLS alto` | Añadir `width`/`height` a todas las imágenes |
| `LCP lento` | Preload hero image, optimizar WebP/AVIF, CDN |
| `TBT alto` | Verificar que hero-3d-lazy.js carga deferred |
| `Cache no funciona` | Verificar `Cache-Control` headers, versionar assets (`?v=8`) |

## 📞 Contacto Soporte

- **Email**: contacto@dpzdata.com
- **Repositorio**: https://github.com/dpzconsulting/web
- **Docs**: https://dpzdata.com/docs

---

> **Nota**: Tras confirmar que todo funciona (24-48h), descomenta la línea `Strict-Transport-Security` en nginx y recarga: `sudo systemctl reload nginx`