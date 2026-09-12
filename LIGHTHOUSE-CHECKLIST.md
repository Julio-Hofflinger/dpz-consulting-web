# DPZ Consulting — Lighthouse Performance Checklist

## 🚀 Cómo ejecutar Lighthouse localmente

```bash
# Opción 1: Chrome DevTools (recomendado)
# 1. Abre http://localhost:3000 en Chrome
# 2. F12 → pestaña Lighthouse
# 3. Selecciona: Performance, Accessibility, Best Practices, SEO, PWA
# 4. Device: Mobile + Desktop
# 5. Click "Analyze page load"

# Opción 2: CLI (si funciona en tu entorno)
npx lighthouse http://localhost:3000 --view --preset=desktop

# Opción 3: PageSpeed Insights (online)
# https://pagespeed.web.dev/analysis?url=https://dpzdata.com
```

---

## 📊 Métricas Objetivo (Core Web Vitals)

| Métrica | Bueno | Necesita mejora | Malo |
|---------|-------|-----------------|------|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | 2.5-4s | > 4s |
| **FID** / **INP** (Interaction to Next Paint) | ≤ 200ms | 200-500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | 0.1-0.25 | > 0.25 |
| **FCP** (First Contentful Paint) | ≤ 1.8s | 1.8-3s | > 3s |
| **TBT** (Total Blocking Time) | ≤ 200ms | 200-600ms | > 600ms |
| **Speed Index** | ≤ 3.4s | 3.4-5.8s | > 5.8s |

---

## ✅ Checklist de Auditoría

### Performance
- [ ] **LCP < 2.5s** — Hero image preload + fetchpriority="high"
- [ ] **CLS < 0.1** — Imágenes con width/height, font-display: swap
- [ ] **TBT < 200ms** — Three.js lazy-loaded, code splitting
- [ ] **Unused JS < 100KB** — Import maps, dynamic imports
- [ ] **Render-blocking resources** — CSS crítico inline, defer no crítico
- [ ] **Image optimization** — WebP/AVIF, responsive images, lazy loading
- [ ] **Third-party scripts** — CDN fonts preconnect, GSAP/Lenis cached
- [ ] **Compression** — Brotli/Gzip en servidor
- [ ] **Caching** — Cache-Control: max-age=31536000 para assets hasheados

### Accessibility
- [ ] **Color contrast** ≥ 4.5:1 (WCAG AA)
- [ ] **Focus indicators** visibles (:focus-visible)
- [ ] **ARIA labels** en botones/iconos sin texto
- [ ] **Skip link** funcional
- [ ] **Heading hierarchy** correcta (h1→h2→h3)
- [ ] **Alt text** en todas las imágenes
- [ ] **Form labels** asociados
- [ ] **Reduced motion** respetado (prefers-reduced-motion)
- [ ] **Touch targets** ≥ 44×44px en móvil

### Best Practices
- [ ] **HTTPS** en todas las páginas
- [ ] **CSP headers** configurados
- [ ] **No console errors** en producción
- [ ] **Secure cookies** (SameSite, Secure, HttpOnly)
- [ ] **No deprecated APIs**
- [ ] **Image aspect ratios** definidos
- [ ] **Font loading** optimizado (preload + font-display)

### SEO
- [ ] **Meta description** única por página (150-160 chars)
- [ ] **Structured data** (Schema.org) válido
- [ ] **Canonical URLs** correctas
- [ ] **Robots.txt** y sitemap.xml
- [ ] **h1** único por página
- [ ] **Open Graph / Twitter Cards** completas
- [ ] **Semantic HTML** (main, article, section, nav, aside)

### PWA (Opcional)
- [ ] **Manifest.json** válido
- [ ] **Service Worker** con estrategia cache-first
- [ ] **Offline fallback** page
- [ ] **Installable** (icons 192/512, theme color)

---

## 🎯 Optimizaciones Implementadas

| Optimización | Estado | Archivo |
|--------------|--------|---------|
| **Resource Hints** (preconnect, dns-prefetch, preload) | ✅ | `index.html`, `servicios.html`, etc. |
| **Import Maps** para Three.js | ✅ | `index.html` |
| **Lazy Load Hero 3D** (IntersectionObserver) | ✅ | `hero-3d-lazy.js` |
| **Quality Tiers** (high/medium/low) | ✅ | `hero-3d-premium.js` |
| **Reduced Motion** respect | ✅ | CSS + JS |
| **CSS crítico** inline + defer no crítico | ✅ | `style.css` (print hack) |
| **WebP images** con fallback | ✅ | HTML `picture` / `img` |
| **Font-display: swap** | ✅ | Google Fonts URL |
| **Compression ready** (Brotli/Gzip) | ⚠️ | Requiere config servidor |
| **Cache headers** para assets hasheados | ⚠️ | Requiere config servidor |
| **Service Worker** | ❌ | Pendiente |

---

## 📈 Métricas Esperadas Post-Deploy

### Desktop (High Tier)
| Métrica | Estimado |
|---------|----------|
| Performance | 90-95 |
| Accessibility | 95-100 |
| Best Practices | 90-100 |
| SEO | 95-100 |

### Mobile (Medium Tier)
| Métrica | Estimado |
|---------|----------|
| Performance | 75-85 |
| Accessibility | 95-100 |
| Best Practices | 90-100 |
| SEO | 95-100 |

---

## 🔧 Configuración Servidor Requerida (nginx/Apache)

```nginx
# Compresión
gzip on;
gzip_types text/css application/javascript image/svg+xml;
brotli on;
brotli_types text/css application/javascript image/svg+xml;

# Cache para assets versionados
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|webp|avif)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# HTML no cacheado agresivamente
location ~* \.html$ {
    expires -1;
    add_header Cache-Control "no-cache, must-revalidate";
}

# Security headers
add_header X-Frame-Options "SAMEORIGIN";
add_header X-Content-Type-Options "nosniff";
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()";
```

---

## 🧪 Testing Cross-Browser

| Navegador | Versión mínima | WebGL2 | Notas |
|-----------|----------------|--------|-------|
| Chrome | 90+ | ✅ | Completo |
| Firefox | 88+ | ✅ | Completo |
| Safari | 15+ | ✅ | Requiere fallback reduced-motion |
| Edge | 90+ | ✅ | Completo |
| Safari iOS | 15+ | ✅ | Low tier automático |

---

## 📝 Próximos Pasos Post-Launch

1. **Semana 1**: Monitorear Core Web Vitals en Search Console / PageSpeed
2. **Semana 2**: A/B test quality tier selector en theme-switcher
3. **Mes 1**: Implementar Service Worker + PWA manifest
4. **Mes 1**: Configurar compresión Brotli + cache headers en producción
5. **Continuo**: Budget JS < 170KB gzipped (actual ~120KB base + 80KB Three.js lazy)

---

**Última actualización**: $(date)
**Versión**: 1.0.0-premium-3d