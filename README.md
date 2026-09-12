# DPZ Consulting — Sitio web

Sitio web corporativo de **DPZ Consulting** (Diagnóstico, Planificación y Zonificación del Territorio), consultora técnica ambiental, forestal y territorial con cobertura en la Región Metropolitana y regiones aledañas (Valparaíso, O'Higgins y Maule).

- **Dominio:** https://dpzdata.com
- **Stack:** HTML5 + CSS3 + JavaScript (sin framework, sin build)
- **Efectos:** GSAP + ScrollTrigger + Lenis (smooth-scroll), hero 3D (nube de puntos Three.js), reveals, contadores
- **Multitema:** 5 variantes cromáticas de marca (Bosque, Humedal, Desierto, Altiplano, Sabana)

---

## Estructura del proyecto

```
WEB DPZ/
├── index.html                 # Home
├── servicios.html             # Detalle de las 8 líneas de servicio
├── nosotros.html              # Misión, visión, enfoque, equipo
├── blog.html                  # Índice del blog (con filtro por categoría)
├── contacto.html              # Formulario + datos de contacto
├── 404.html                   # Página de error con estilo de marca
├── blog/
│   ├── observaciones-autoridad-proyecto.html
│   ├── cartografia-sig-diagnostico-territorial.html
│   └── diseno-reforestaciones-supervision.html
├── assets/
│   ├── css/style.css          # Sistema de diseño + temas + componentes
│   ├── js/main.js             # Interacciones (scroll, temas, blog)
│   ├── js/hero-3d.js          # Hero 3D: nube de puntos del logo (Three.js)
│   └── img/
│       ├── logos/             # Isologo color + blanco (transparentes)
│       ├── favicon/           # Favicons 16–512 + .ico
│       ├── photos/            # Fotos de contenido en WebP (locales, multi-resolución)
│       └── og/og-dpz.png      # Imagen Open Graph 1200×630
├── tools/
│   ├── posts.json             # Configuración/contenido de los artículos del blog
│   └── generate_blog.py       # Generador de artículos (HTML + blog.html + sitemap)
├── robots.txt
├── sitemap.xml
├── site.webmanifest
└── Recursos DPZ Consulting/   # Material fuente (marca, PDF servicios)
```

---

## Cómo previsualizar en local

El sitio es estático. Necesita un servidor HTTP local (por las rutas absolutas y el manifest).

```powershell
# Opción 1: Python
python -m http.server 5500

# Opción 2: Node
npx serve -l 5500
```

Luego abre `http://localhost:5500`.

> Nota: las imágenes de contenido provienen de Unsplash (requieren conexión). Los logos, favicons y la imagen OG son locales.

---

## Cómo añadir un nuevo artículo al blog (generador automático)

El blog se genera con un script. **No edites los artículos a mano**: edita `tools/posts.json`
y ejecuta el generador. Éste crea el HTML, descarga y convierte la imagen a WebP local, y
actualiza automáticamente la grilla y los filtros de `blog.html` y el `sitemap.xml`.

### Pasos

1. Abre `tools/posts.json` y **añade un objeto** al array `"posts"`. Ejemplo mínimo:

   ```json
   {
     "slug": "mi-nuevo-articulo",
     "title": "Título del artículo",
     "category": "diagnostico",
     "focus_keyword": "diagnóstico territorial en Chile",
     "secondary_keywords": ["cartografía SIG", "análisis espacial"],
     "intent": "informacional",
     "date": "2026-08-01",
     "updated": "2026-08-01",
     "read": "6 min",
     "excerpt": "Resumen corto para la tarjeta del blog.",
     "description": "Meta description para SEO (150-160 caracteres).",
     "image": "assets/img/photos/dpz-cartografia-sig-900.webp",
     "image_alt": "Descripción de la imagen",
     "service_link": "nombre del servicio a enlazar",
     "cta_title": "Título del recuadro CTA",
     "cta_text": "Texto del recuadro CTA.",
     "lead": "Párrafo de introducción destacado.",
     "key_takeaways": ["Idea accionable 1", "Idea accionable 2", "Idea accionable 3"],
     "sections": [
       { "id": "seccion-1", "h2": "Título de sección", "html": "<p>Contenido HTML...</p>",
         "key": "(opcional) frase de punto clave destacada" }
     ],
     "faqs": [{ "question": "Pregunta concreta", "answer": "Respuesta breve y precisa." }],
     "sources": [{ "name": "Fuente oficial", "url": "https://www.example.gob.cl/fuente" }]
   }
   ```

   - `image`: ruta de una imagen local. También puedes usar `photo` con un ID de Unsplash; el script
     la descarga y convierte a WebP la primera vez.
   - `category`: una clave de `"categories"` en el JSON. Si usas una **categoría nueva**,
     agrégala primero al objeto `"categories"` (clave → etiqueta visible) y el filtro
     aparecerá solo en `blog.html`.

2. Ejecuta el pre-mortem y corrige cualquier error bloqueante:

   ```powershell
   npm run blog:premortem
   # Para revisar un solo borrador:
   python tools/blog_premortem.py --slug mi-nuevo-articulo
   ```

   El pre-mortem valida slugs, fechas, categorías, imágenes, longitud de metadatos, keyword principal,
   estructura H2, FAQs, fuentes y HTML peligroso. El generador también lo ejecuta automáticamente y no
   escribe artículos si detecta errores bloqueantes.

3. Ejecuta el generador:

   ```powershell
   python tools/generate_blog.py            # regenera todos los artículos + blog.html + sitemap
   python tools/generate_blog.py --slug mi-nuevo-articulo   # solo un artículo
   ```

4. Ejecuta la auditoría técnica:

   ```powershell
   npm run blog:generate
   npm run seo:audit
   ```

5. Listo. El artículo queda en `blog/<slug>.html`, con SEO, JSON-LD (`Article`), breadcrumbs,
   tabla de contenidos, resumen, preguntas frecuentes, fuentes, CTA y relacionados; y aparece en la
   grilla, filtros y sitemap del blog.

> El generador es **idempotente**: puedes ejecutarlo las veces que quieras sin duplicar nada.

La guía editorial completa está en [`docs/BLOG-PRE-MORTEM.md`](docs/BLOG-PRE-MORTEM.md). El flujo sigue
las recomendaciones de Yoast sobre intención de búsqueda, estructura clara, legibilidad, medios, enlaces
internos, metadatos y autoridad temática. La estrategia apunta a consultas específicas en Chile; ningún
proceso SEO puede garantizar el primer lugar orgánico.

## Publicación autónoma cuatro veces por semana

La cola y el workflow de GitHub Actions están en [`tools/blog_queue.json`](tools/blog_queue.json) y
[`docs/BLOG-AUTOMATION.md`](docs/BLOG-AUTOMATION.md). El proceso publica martes, miércoles, jueves y
viernes solo después de generar el borrador, ejecutar el pre-mortem, reconstruir el sitio y pasar la
auditoría SEO. Requiere configurar una API de contenido y los secretos de despliegue descritos en esa guía.

---

## Datos pendientes de reemplazar (placeholders)

Busca y reemplaza en todo el proyecto cuando tengas los datos reales:

| Placeholder | Dónde | Reemplazar por |
|---|---|---|
| `contacto@dpzdata.com` | footer, contacto, schema | Correo real |
| `+56 9 6227 0739` / `+56962270739` | footer, contacto, schema | Teléfono real |
| `href="#"` en iconos sociales | footer de todas las páginas | URLs de LinkedIn / Instagram |
| `telephone` en JSON-LD | `<head>` de index.html | Teléfono real |
| Imágenes en `assets/img/photos/*.webp` | fotos de contenido | Fotos propias en WebP (mismo nombre) |

---

## SEO implementado (estilo Yoast)

- **Meta**: title, description, canonical, robots, Open Graph y Twitter Cards por página.
- **Schema JSON-LD `@graph`**: `Organization`, `WebSite`, `WebPage`/`CollectionPage`,
  `BreadcrumbList`, `ProfessionalService` (con `areaServed` local y catálogo de servicios)
  y `Article` + `Person` en cada entrada del blog.
- **Local SEO**: área de servicio = RM + Valparaíso + O'Higgins + Maule.
- `robots.txt`, `sitemap.xml` y `site.webmanifest`.

> Tras publicar, valida el schema en https://search.google.com/test/rich-results y envía el
> sitemap en Google Search Console.

---

## Rendimiento y accesibilidad

- `loading="lazy"` + `decoding="async"` en imágenes; `preload` + `fetchpriority="high"` en la imagen LCP.
- `:focus-visible`, *skip-link* "Saltar al contenido" y soporte de `prefers-reduced-motion`.
- Selector de variante cromática persistente en `localStorage` (sin parpadeo de carga).

---

## Despliegue en dpzdata.com (OVH + GoDaddy)

Sitio **estático**: se publica subiendo archivos. Dominio canónico: **https://dpzdata.com** (sin www).

### 1. Subir a OVH (FTP/SSH)
Sube el contenido de esta carpeta a la raíz web de OVH (`/www` o `/public_html`), incluido el
`.htaccess`. **No** subas `Recursos DPZ Consulting/`, `tools/` ni `README.md` (no son necesarios
en producción). `index.html` debe quedar en la raíz.

### 2. DNS en GoDaddy
En *DNS Management* de dpzdata.com (con la IP de tu hosting OVH, visible en el panel OVH):

| Tipo | Nombre | Valor |
|---|---|---|
| A | `@` | IP del hosting OVH |
| CNAME | `www` | `dpzdata.com` |

(Alternativa: cambiar los *nameservers* de GoDaddy por los de OVH y gestionar el DNS en OVH.)

### 3. SSL / HTTPS
Activa el certificado **Let's Encrypt gratuito** en el panel OVH. El `.htaccess` ya fuerza HTTPS
y redirige `www` → `dpzdata.com`.

### 4. `.htaccess` incluido
Ya viene configurado para Apache/OVH: forzar HTTPS, redirección www→sin-www, `404.html`
personalizado, URLs limpias sin `.html`, compresión GZIP, caché de assets, MIME de WebP y
cabeceras de seguridad.

### 5. Tras publicar
- Verifica `https://dpzdata.com` y que `www` redirija bien.
- Valida el schema en https://search.google.com/test/rich-results
- Envía `https://dpzdata.com/sitemap.xml` en Google Search Console.

### Otros hostings (alternativa)
También funciona en Netlify / Vercel / Cloudflare Pages / GitHub Pages sin build (arrastrar la
carpeta o conectar el repo).
