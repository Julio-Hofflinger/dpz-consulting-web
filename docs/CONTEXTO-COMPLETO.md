# DPZ Consulting — Contexto Completo del Proyecto

> Última actualización: 2026-07-15

---

## 1. IDENTIDAD DEL PROYECTO

| Campo | Valor |
|---|---|
| **Nombre** | DPZ Consulting |
| **Dominio** | https://dpzdata.com |
| **Hosting** | OVH (Fedora + Caddy) — IP: 142.44.213.117 |
| **Usuario SSH** | ubuntu |
| **Clave SSH** | `~/.ssh/id_ed25519` |
| **Deploy** | `pwsh tools/deploy.ps1` (scp + rsync con sudo) |
| **Stack** | HTML5 + CSS3 + JS vanilla (sin framework, sin build) |

### 1.1 Propósito

Site corporativo de consultora técnica **ambiental, forestal y territorial**. Cobertura: Región Metropolitana, Valparaíso, O'Higgins y Maule. Diagnóstico, Planificación y Zonificación del Territorio.

---

## 2. ESTRUCTURA DEL SITIO

```
WEB DPZ/
├── index.html                 # Home con hero 3D
├── servicios.html             # 8 líneas de servicio
├── nosotros.html              # Misión, visión, equipo
├── blog.html                  # Índice del blog (filtros por categoría)
├── contacto.html              # Formulario + datos de contacto
├── 404.html                   # Página de error
├── blog/                      # 6 artículos (generados automáticamente)
├── assets/
│   ├── css/style.css          # Sistema de diseño completo
│   ├── js/main.js             # Interacciones (GSAP, ScrollTrigger, Lenis)
│   ├── js/hero-3d.js          # Three.js — nube de puntos del logo
│   ├── js/page-particles.js   # Efecto partículas en páginas interiores
│   └── img/                   # logos/, favicon/, photos/, og/
├── tools/
│   ├── deploy.ps1             # Script de despliegue a OVH
│   ├── check-prod.mjs         # Verifica estado de producción
│   ├── generate_blog.py       # Generador de artículos del blog
│   ├── posts.json             # Datos fuente del blog (6 artículos)
│   ├── caddy-dpzdata.conf     # Configuración Caddy
│   └── setup-all.sh           # Setup inicial servidor
├── prompts-imagenes.json      # Prompts IA para las 3 imágenes pendientes
└── docs/
    └── CONTEXTO-COMPLETO.md   # ← ESTE DOCUMENTO
```

---

## 3. SERVICIOS (8 líneas — servicios.html)

Cada uno con tarjeta imagen + texto + lista de items:

| # | Servicio | Imagen actual (Unsplash) | Estado |
|---|---|---|---|
| 1 | **Diagnóstico ambiental-territorial** | `1502920917128-1a-1000.webp` | 🟡 Reemplazar con IA |
| 2 | **Cartografía SIG** | `1524661135-42399-1000.webp` | ✅ Unsplash |
| 3 | **Gestión forestal y vegetacional** | `1416879595882-33-1000.webp` | 🟡 Reemplazar con IA |
| 4 | **Soporte regulatorio y tramitaciones** | `1454165804606-c3-1000.webp` | ✅ Unsplash |
| 5 | **Diseño y supervisión de reforestaciones** | `1466692476868-ae-1000.webp` | ✅ Unsplash |
| 6 | **Censo y caracterización de arbolado urbano** | `1523712999610-f7-1000.webp` | 🟡 Reemplazar con IA |
| 7 | **Diagnóstico de suelos, fuego y riesgos** | `1470115636492-6d-1000.webp` | ✅ Unsplash |
| 8 | **Apoyo técnico a consultoras** | `1600880292203-75-1000.webp` | ✅ Unsplash |

**3 imágenes pendientes de reemplazar:**
- 1 → Diagnóstico ambiental (1502920917128-1a)
- 3 → Gestión forestal (1416879595882-33)
- 6 → Arbolado urbano (1523712999610-f7)

Los prompts para generarlas con IA están en `prompts-imagenes.json`.

---

## 4. TECNOLOGÍAS Y DEPENDENCIAS

### Frontend
- **CSS**: Sistema de diseño propio con 5 variantes cromáticas (Bosque, Humedal, Desierto, Altiplano, Sabana) vía `data-theme` + `localStorage`
- **JS**: GSAP 3.12.5 + ScrollTrigger + Lenis 1.0.42 (smooth scroll)
- **3D**: Three.js (hero-3d.js — nube de puntos del isologo), page-particles.js (interiores)
- **Favicons**: PNG multiresolución + .ico

### Blog (generador Python)
- `tools/posts.json` → fuente única de datos
- `tools/generate_blog.py` genera: HTML de cada artículo + grilla blog.html + sitemap.xml
- Imágenes Unsplash descargadas y convertidas a WebP local (900px y 1600px)
- Sin build, idempotente

### SEO
- Meta tags, Open Graph, Twitter Cards por página
- Schema JSON-LD `@graph`: Organization, WebSite, WebPage, BreadcrumbList, ProfessionalService, Article + Person
- Local SEO con areaServed (RM + Valparaíso + O'Higgins + Maule)
- `robots.txt`, `sitemap.xml`, `site.webmanifest`
- Google Search Console: `google4f471a0ec4087197.html`

### Rendimiento
- `loading="lazy"` + `decoding="async"` en imágenes
- `preload` + `fetchpriority="high"` en LCP
- `prefers-reduced-motion` soportado
- Tema persistente sin parpadeo (localStorage antes del render)

---

## 5. INTEGRACIONES

| Integración | Detalle | Estado |
|---|---|---|
| **Formspree** | Formulario de contacto → endpoint `xnjevjvq` | ✅ Reemplazado |
| **GSAP + ScrollTrigger** | Animaciones scroll, reveals, contadores | ✅ CDN |
| **Lenis** | Smooth scroll | ✅ CDN |
| **Three.js** | Hero 3D (index.html) y partículas (interiores) | ✅ CDN |
| **Google Fonts** | Space Grotesk + Inter | ✅ CDN |
| **Unsplash** | Fotos de placeholder en servicios y blog | 🟡 Reemplazar 3 en servicios |
| **GoDaddy** | DNS: A @ → IP OVH, CNAME www → dpzdata.com | ✅ |
| **Let's Encrypt** | SSL vía Caddy | ✅ |
| **Google Search Console** | Validación con archivo TXT | ✅ |

---

## 6. HISTORIAL DE CAMBIOS REALIZADOS

### Sesión 2026-07-15

| Cambio | Archivos afectados |
|---|---|
| Eliminación de código muerto de controles | Varios |
| Fix en manejador de error del logo (isologos) | Varias páginas |
| Cache bust a `page-particles.js?v=2` | Todas las páginas |
| Reemplazo endpoint Formspree → `xnjevjvq` | contacto.html |
| Despliegue a producción exitoso | — |

### Pendientes

| # | Tarea | Archivo |
|---|---|---|
| 1 | Reemplazar imagen **Arbolado Urbano** con IA | servicios.html:353 |
| 2 | Reemplazar imagen **Diagnóstico Ambiental** con IA | servicios.html:283 |
| 3 | Reemplazar imagen **Gestión Forestal** con IA | servicios.html:311 |
| 4 | Integrar logo DPZ en las 3 imágenes generadas (en vestimenta) | prompts-imagenes.json |
| 5 | Verificar visualmente + deploy | — |

### Placeholders futuros (datos reales del cliente)

| Placeholder | Reemplazar por |
|---|---|
| `contacto@dpzdata.com` | Correo real del cliente |
| `+56962270739` | Teléfono real |
| `href="#"` en iconos sociales | URLs reales de LinkedIn/Instagram |

---

## 7. DESPLIEGUE

```powershell
pwsh -File tools\deploy.ps1
```

Flujo:
1. Copia archivos a `%TEMP%\dpz-deploy` (excluye `Recursos DPZ Consulting/`, `tools/`, `docs/`, `README.md`)
2. SCP al servidor (`/tmp/dpz-upload/`)
3. SSH + rsync con `--delete` a `/var/www/dpzdata`
4. Chown a caddy:caddy, chmod 755

Verificación post-deploy:
```powershell
node tools/check-prod.mjs
```

---

## 8. CÓMO AÑADIR UN ARTÍCULO AL BLOG

1. Editar `tools/posts.json` — agregar objeto al array `"posts"`
2. Ejecutar: `python tools/generate_blog.py`
3. Opcional: `--slug mi-articulo` para solo uno
4. El script descarga foto Unsplash, la convierte a WebP, genera HTML, actualiza blog.html y sitemap.xml
5. Hacer deploy

---

## 9. RECURSOS DE MARCA

Están en `Recursos DPZ Consulting/kit de marca/`:
- `ISOLOGO DPZ.png` — isologo principal
- `Variantes logo DPZ.png` — variantes cromáticas
- `Manual de Identidad Visual - DPZ.pdf` — manual de marca
- `Diseño sin título (54).png` — asset adicional

Logos en uso en `assets/img/logos/`:
- `isologo-color.png` — header
- `isologo-white.png` — footer
