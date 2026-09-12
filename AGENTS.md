# DPZ Consulting — Web Project Context

> **Purpose**: This file is the single source of truth for any AI agent (Claude, GPT, etc.) to understand,
> continue, or maintain the DPZ Consulting website. Read this first before making any changes.

---

## ⓵ Project Overview

| Field | Value |
|-------|-------|
| **Site** | https://dpzdata.com |
| **Description** | Consulting website for environmental, forestry, and territorial services in Chile |
| **Stack** | Vanilla HTML/CSS/JS, Three.js r164 (ES modules via importmap), GSAP 3.12.5, Lenis 1.0.42 |
| **Server** | Ubuntu 26.04, Caddy v2 (reverse proxy), OVH VPS |
| **Web root** | `/var/www/dpzdata/` |
| **Ownership** | `caddy:caddy` |
| **Backup** | Old version at `/var/www/dpzdata/assets/js/hero-3d-premium.js.bak` |

---

## ⓶ Five Pages

| Page | URL | Key Components |
|------|-----|---------------|
| **index.html** | `/` | Hero 3D canvas (Earth + satellite + orbit + stars + point clouds), statement grid, CTAs, services preview |
| **servicios.html** | `/servicios.html` | 8 × `.svc-card-3d` vertical cards (image top 16/9, icon, title, desc, features pinned bottom), pricing section `#como-cotizamos` with pills |
| **nosotros.html** | `/nosotros.html` | Statement grid, mission/vision, team grid, stats |
| **blog.html** | `/blog.html` | 6 × `.blog-card-3d` with categories, filter buttons, responsive 3-col grid |
| **contacto.html** | `/contacto.html` | Form with Formspree (`action="https://formspree.io/f/xnjevjvq"`) |

### Additional static files
```
404.html                          Custom error page
robots.txt                        Standard robots
sitemap.xml                       XML sitemap
site.webmanifest                  PWA manifest
google4f471a0ec4087197.html       Google Search Console verification
```

---

## ⓷ CSS Design Tokens (`assets/css/style.css` — 1652 lines)

### Brand Colors (5 territorial theme variants via `[data-theme]`)
| Theme | Primary | Secondary | Accent |
|-------|---------|-----------|--------|
| `bosque` (default) | `#1E4D2B` | `#6BAA27` | `#A9C73F` |
| `humedal` | `#114B44` | `#2E8B7C` | `#8FD3C4` |
| `desierto` | `#6B3F1D` | `#C97D3E` | `#E8B771` |
| `altiplano` | `#4A4A3A` | `#8C8C6D` | `#C9C9A8` |
| `sabana` | `#5A5A1E` | `#A6A63D` | `#D9D97A` |

### Glassmorphism System
```css
--glass-bg: rgba(255,255,255,0.08);     /* card backgrounds */
--glass-border: rgba(255,255,255,0.18); /* card borders */
--glass-blur: saturate(180%) blur(20px); /* backdrop filter */
--glass-highlight: rgba(255,255,255,0.4); /* top-edge light reflection */
```

### Elevation System
```css
--elev-1: subtle surface
--elev-2: card resting
--elev-3: elevated card
--elev-glass: premium glass card with color accent
--elev-crystal: crystal/hero-level depth
```

### Motion Tokens
```css
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);  /* bouncy */
--ease-expo: cubic-bezier(0.16, 1, 0.3, 1);         /* smooth deceleration */
--ease-gloss: cubic-bezier(0.25, 0.46, 0.45, 0.94); /* hover transitions */
```

### Typography
- **Display**: `Space Grotesk` (400, 500, 600, 700)
- **Body**: `Inter` (400, 500, 600)
- Both loaded from Google Fonts via `<link>`

---

## ⓸ JavaScript Architecture

### `assets/js/hero-3d.js` — Main 3D Scene (GLB models, since v110)

**Loading**: `<script type="module" src="assets/js/hero-3d.js?v=110"></script>` (only index.html)
**Import map**: `three` → `cdn.jsdelivr.net/npm/three@0.164.0/build/three.module.js`

**Scene objects**:
1. `scene.background = null` + `WebGLRenderer({ alpha:true })` — transparent; dark gradient comes from CSS `.hero__media`
2. Stars (1500 points, round CanvasTexture sprite, vertexColors)
3. **Earth** — `assets/models/tierra_web.glb` (3.2MB), normalized to radius 3.1 via bounding sphere, rotates with tilt 0.41
4. **Satellite** — `assets/models/simple_satellite_low_poly_free.glb` (346KB), normalized to 0.9 max dim, orbits at `EARTH_RADIUS*1.55` with `lookAt(0,0,0)`
5. **Astronaut** — `assets/models/astronaut_web_fixed.glb` (13.6MB), normalized to 1.7, floats at `ASTRONAUT_HOME (3.5,1.5,3.0)`; GLB animation if present, else procedural float (y-sine + slow rotation); **draggable** via raycaster (pointerdown/move/up), clamped to 7.5 from origin

**Groups**: `worldGroup` (shifted `x:1.5,y:0.5` on desktop ≥900px, `y:1.2` on mobile) contains earth/satellite/astronaut groups.

**OrbitControls**: damping 0.08, rotate only — `enableZoom:false` + `enablePan:false` (wheel/touch scroll belongs to the page), `touchAction:"pan-y"` on canvas (vertical touch = page scroll, horizontal = orbit).

**Scroll zoom**: `setScrollProgress(p)` (called by main.js ScrollTrigger) lerps camera distance `12 → 16.5` — applied BEFORE `controls.update()` to avoid fighting OrbitControls.

**Contract with main.js** (MUST keep when editing): dispatch `hero3d:ready` + `window.__hero3dReady = true` after init (reveals hero text), expose `window.setScrollProgress`, auto-init guard `window.__hero3dPremiumInit`.

**Key functions**: `initHero3D()`, `setupScene(canvas)`, `normalize(object, targetSize, mode)`, `setScrollProgress(p)`

**Backup**: previous procedural scene (crystal Earth + rings + point clouds) at `assets/js/hero-3d-procedural.js.bak`

### `assets/js/main.js` (21KB) — Core Interactions

**Loaded as**: Classic `<script>` (NOT module)  
**Dependencies**: Lenis, GSAP, ScrollTrigger (CDN scripts loaded before)

**Key functions**:
- `initLenis()` — Smooth scroll with `duration:0.35`, `easing: linear`
- `initHero3D()` — listens for `hero3d:ready` event, then calls `revealHero()`
- `revealHero()` — animates hero text lines and fades extra elements
- `initBlogFilter()` — filters blog cards by `data-cat` attribute
- `initReveals()` — GSAP ScrollTrigger on-scroll reveals
- `initCounters()` — animated number counters
- `initHeader()` — header scroll state
- `initMobileNav()` — burger menu
- `initThemeSwitch()` — 5-color theme switcher (bottom-right FAB)
- `initForm()` — Formspree contact form handler
- `initBlogFilter()` — category filter for blog grid
- `initPremiumInteractions()` — magnetic buttons, glass card 3D tilt, particle trails

### `assets/js/hero-3d-premium.js` (52KB) — Old Version (NOT USED)
- Previous implementation with GLTF Earth model loading (163MB — too heavy, abandoned)
- Contains `ChromaticAberrationShader` import (404 in Three.js r164)
- **DO NOT USE** — kept as reference only

### `assets/js/hero-3d-lazy.js` (3.4KB) — Lazy Loader (NOT USED)
- Was used to lazy-load the premium module
- **NOT in use** — hero loads directly via `type="module"`

### `assets/js/page-particles.js` (3.5KB) — Decorator (NOT USED on index)
- Used on subpages for decorative particles
- **NOT imported on index.html** anymore (3D handles its own particles)

---

## ⓹ 3D Scene Technical Details

| Parameter | Value |
|-----------|-------|
| **Canvas** | `#hero-canvas` inside `.hero__media` div |
| **Renderer** | `WebGLRenderer({ alpha:false, antialias:true })` |
| **Pixel ratio** | `Math.min(devicePixelRatio, 1.25)` (capped for performance) |
| **Camera** | `PerspectiveCamera(55°, aspect, 0.1, 200)` at position `(0, 0, 6)` |
| **Tone mapping** | `ACESFilmicToneMapping` with exposure `1.1` |
| **Bloom** | `UnrealBloomPass(0.45, 0.2, 0.12)` |
| **Lighting** | Ambient(0x112211, 0.6) + Directional(0xffffee, 2.2 at 15,25,10) + Fill(0x88aaff) + Rim(0xffddaa) |
| **Shadows** | Enabled on sunLight, mapSize 1024×1024 |

### Z-Index Stacking (Hero Section)
```
hero__media         z-index: 0  (container)
  ├── canvas        z-index: 1  (3D scene)
  ├── img           no z-index  (background photo, opacity:0)
  └── ::before      z-index: 3  (noise texture, opacity:0.14)
hero__content       z-index: 2  (text + CTAs)
hero__content::before           (radial dark gradient for readability)
```

### Canvas CSS
```css
.hero__media canvas {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  z-index: 1;
}
```

---

## ⓺ Image Assets

```
assets/img/
├── favicon/          (favicon.ico, favicon-{16,32,180,192,512}.png)
├── logos/            (isologo-color.png, isologo-white.png)
├── og/               (og-dpz.png — Open Graph image 1200×630)
└── photos/           (30+ WebP images, multiple resolutions per photo)
    ├── 1441974231531-c6-2000.webp   ← Hero background photo
    ├── 1454165804606-c3-{900,1000,1600,2000}.webp
    ├── 1466692476868-ae-{900,1000,1600}.webp
    ├── 1470115636492-6d-{900,1000,1600}.webp
    ├── 1502920917128-1a-{900,1000}.webp
    ├── 1523712999610-f7-{900,1000,1600}.webp
    ├── 1524661135-42399-{900,1000,1600}.webp
    ├── 1447752875215-b2-2000.webp
    ├── 1497215728101-85-2000.webp
    ├── 1500382017468-90-2000.webp
    ├── 1416879595882-33-{900,1000,1600}.webp
    ├── 1600880292203-75-1000.webp
    └── [others for blog posts]
```

### 3D Models
```
assets/models/
├── tierra_web.glb                        ← 3.2MB (USED — hero Earth)
├── simple_satellite_low_poly_free.glb    ← 346KB (USED — hero satellite)
├── astronaut_web_fixed.glb               ← 13.6MB (USED — hero astronaut, draggable)
└── earth_-_16k_high_resolution.glb       ← 163MB (NOT USED — safe to delete)
```

---

## ⓻ Changelog

### v110 (current) — Hero 3D con modelos GLB reales
- ✅ Escena procedural reemplazada por modelos GLB: Tierra texturizada (`tierra_web.glb`), satélite y astronauta
- ✅ Astronauta arrastrable (raycaster pointerdown/move/up), clamp 7.5 desde origen
- ✅ OrbitControls rotate-only (zoom/pan off — el scroll es de la página), touchAction pan-y
- ✅ Fondo transparente (`alpha:true`), degradado oscuro en CSS `.hero__media`
- ✅ Estrellas redondas (CanvasTexture), 1500 puntos
- ✅ Backup escena procedural: `assets/js/hero-3d-procedural.js.bak`
- ✅ style.css `?v=26`, hero-3d.js `?v=110`

### v25 — UX/UI overhaul: service cards, icons, alignment
- ✅ `.svc-card-3d` redesigned: vertical flex card (media top 16/9 full-bleed, content flex-column, features pinned to bottom with `margin-top:auto`). Was: 2-column inner grid → elongated unreadable cards
- ✅ 8 thematic service icons (magnifier+leaf, GIS layers, pine, shield+check, sprout, building+tree, flame+strata, two users) replacing generic/duplicated ones
- ✅ 4 contact icons redesigned: paper plane (Correo), handset+signal (Teléfono), globe (Cobertura), chat bubble+clock (Respuesta)
- ✅ "Cómo cotizamos" in servicios.html: was orphan div between `</section>` tags (4 closes / 3 opens) — now proper `<section class="section bg-mist">`, left-aligned
- ✅ `text-justify` removed from index/nosotros/contacto (justified text created rivers/gaps); class still defined in CSS but unused
- ✅ style.css bumped to `?v=25` in all 12 HTML files

### v107 — Stable production
- ✅ Earth: procedural IcosahedronGeometry with crystal MeshPhysicalMaterial
- ✅ Satellite: procedural BoxGeometry + PlaneGeometry + CylinderGeometry
- ✅ 4 elliptical orbit rings with AdditiveBlending
- ✅ 2000 background point clouds + 200 orbit particles
- ✅ Stars background (800 points)
- ✅ Post-processing: UnrealBloomPass
- ✅ Scroll-driven camera zoom: `setScrollProgress(progress)`
- ✅ Responsive canvas resize
- ✅ `createSectionPointClouds()` utility for subpages
- ✅ Hero text readability: dark radial gradient + text-shadow
- ✅ CTA band text: strong text-shadow for contrast
- ✅ Blog grid: 3 columns desktop, 2 tablet, 1 mobile, grid-auto-rows: 1fr
- ✅ Blog filter: 7 category buttons (all, regulatorio, sig, reforestacion, arbolado, forestal, riesgos)
- ✅ Contact form: brand-colored inputs with focus states and rounded borders
- ✅ Lenis smooth scroll: duration 0.35, linear easing, wheelMultiplier 1.0
- ✅ Theme switcher: 5 territorial variants with color dots
- ✅ 3D always renders (no disposed/paused/IntersectionObserver to stop it)

### Key Bugs Fixed
| Bug | Cause | Fix |
|-----|-------|-----|
| 3D model not loading | `const earthGroup` declared 2x in `createProceduralEarth()` | Removed duplicate; function rewritten |
| 3D model disappears after load | `paused`/`disposed` flags + `IntersectionObserver` stopping render loop | Removed all pause logic; render always runs |
| `starGeo` SyntaxError | Declared 2x in `setupScene()` | Removed unused first declaration |
| `satGroup` SyntaxError | Declared 2x in `createSatellite()` | Removed unused first declaration |
| `logoPoints` SyntaxError | Declared 2x (global + function scope) | Removed function-scope duplicate |
| Chromatic Aberration 404 | `ChromaticAberrationShader.js` doesn't exist in Three.js r164 | Removed import and code |
| Blog card "Suelos & Riesgos" too large | Grid `auto-fit` with `minmax(320px,1fr)` + missing `grid-auto-rows` | Fixed to `repeat(3,1fr)` + `grid-auto-rows:1fr` |
| Blog filter not working | `hidden` attribute overridden by inline `display:flex` | Changed to `card.style.display = show ? "" : ""none"` |
| White filter over hero image | Image `opacity:0.15` + `::after` noise overlay | Set image `opacity:0`, removed `::after` gradient |
| Canvas transparent/invisible | `alpha:true` without scene background | Set `alpha:false` + `scene.background = Color(0x050A05)` |
| Script tag missing `type="module"` | Hero-3d.js uses ES imports but script had only `defer` | Fixed to `<script type="module" ...>` on all 5 pages |
| Hero text hard to read | No text shadow on dark 3D background | Added `text-shadow: 0 2px 24px rgba(...)` + radial overlay |
| Scroll felt "sticky" | Lenis duration 1.1s + exponential easing | Reduced to 0.35s + linear easing + wheelMultiplier 1.0 |
| Loading overlay blocked content | Overlay with `visibility:visible` covering hero | Removed from HTML and CSS entirely |
| Permissions blocking assets | Files owned by `ubuntu:ubuntu`, Caddy runs as `caddy` | `chown -R caddy:caddy /var/www/dpzdata` |
| Contact sidebar below form | Missing `</div>` for form column in `contacto.html` — `.contact-info` nested inside form column, `.contact-grid` had 1 child | Added closing `</div>` after `</form></div>` so INFO is the 2nd grid child |
| Pricing pills cramped against CTA banner | "Cómo cotizamos" block in `servicios.html` was an orphan `<div>` between `</section>` tags (no section padding) | Wrapped in `<section class="section bg-mist">`, left-aligned like other sections |
| Service cards elongated/unreadable | `.svc-card-3d` used inner 2-col grid inside ~380px grid cells → narrow text columns | Card is now vertical flex: media top (16/9), content below, features pinned bottom |

### Known Minor Issues
- `createSectionPointClouds()` utility exists in hero-3d.js but initialization scripts may not be active on all subpages (services, blog, contact)
- `hero-3d-premium.js.bak` (old version) still on server — safe to delete

---

## ⓼ Deployment Architecture

```
User → https://dpzdata.com (443)
  → Caddy (reverse proxy on port 443)
    → Serves static files from /var/www/dpzdata/
    → Caddyfile at /etc/caddy/Caddyfile
    → Also serves velvetpremium.cl on port 3000 (DO NOT TOUCH)

Cache Headers (Caddy):
  - *.css, *.js, *.webp, *.png, *.jpg → Cache-Control: public, max-age=31536000, immutable
  - *.html → Cache-Control: no-cache, must-revalidate

Compression: zstd + gzip (Caddy encode directive)

SSL: Let's Encrypt via Caddy (auto-renew)
```

### Deploy Commands
```bash
# Upload files
scp -i ~/.ssh/dpz_ovh file ubuntu@142.44.213.117:/tmp/file

# Copy to web root
ssh ubuntu@142.44.213.117 "sudo cp /tmp/file /var/www/dpzdata/ && sudo chown caddy:caddy /var/www/dpzdata/file"

# Reload Caddy (if config changed)
ssh ubuntu@142.44.213.117 "sudo systemctl reload caddy"

# Check logs
ssh ubuntu@142.44.213.117 "sudo journalctl -u caddy --no-pager -n 50"
```

### SSH Access
```
Host: 142.44.213.117
User: ubuntu
Key: ~/.ssh/dpz_ovh (or id_ed25519)
```

---

## ⓽ How to Continue Development

### If 3D model doesn't appear:
1. Check browser console (F12 → Console) for SyntaxError messages
2. Verify `<script type="module">` is present (not just `defer`)
3. Check Three.js CDN loads: `curl -sI https://cdn.jsdelivr.net/npm/three@0.164.0/build/three.module.js`
4. Check `assets/js/hero-3d.js` has no duplicate `const`/`let` declarations

### If blog filter doesn't work:
1. Verify `data-cat` on articles matches `data-filter` on buttons
2. Check `initBlogFilter()` in `main.js` — uses `card.style.display` not `card.hidden`

### If text readability is poor:
1. Hero text: adjust `text-shadow` on `.hero__title` and `.hero__desc`
2. Hero content: adjust `.hero__content::before` radial gradient
3. CTA band: adjust `text-shadow` on `.cta-band__title` and `.cta-band .lead`

### If scroll feels wrong:
1. Edit `main.js` → `initLenis()` → `duration` (lower = faster)
2. Easing: `(t) => t` = linear, `(t) => 1 - Math.pow(1-t, 3)` = cubic out

### Bumping cache versions:
```bash
ssh ubuntu@142.44.213.117 "cd /var/www/dpzdata && \
  sudo sed -i 's|hero-3d.js?v=107|hero-3d.js?v=108|g' *.html && \
  sudo sed -i 's|style.css?v=17|style.css?v=18|g' *.html && \
  sudo sed -i 's|main.js?v=7|main.js?v=8|g' *.html"
```

### Adding new theme colors:
1. Add variant to `THEMES` array in `main.js` → `initThemeSwitch()`
2. Add `[data-theme="..."]` CSS block in `style.css`
3. Add `themeColors` entry in `hero-3d.js` → `createEarth()` for crystal material
4. Add logo filter rule `[data-theme="..."] .header.is-scrolled .brand__mark` in `style.css` (filter must convert white → theme primary; solver used: invert/sepia/saturate/hue-rotate/brightness/contrast applied to rgb(255,255,255))

---

## ⓾ Script Loading Order (index.html)

```html
<!-- 1. Preconnect hints -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://cdn.jsdelivr.net">

<!-- 2. Fonts -->
<link href="Google Fonts CSS">

<!-- 3. CSS (async via media="print" hack) -->
<link rel="stylesheet" href="assets/css/style.css?v=17" media="print" onload="this.media='all'">

<!-- 4. Import map for Three.js -->
<script type="importmap">{ "imports": { "three": "...", "three/addons/": "..." } }</script>

<!-- 5. Core libraries (blocking, needed by main.js) -->
<script src="lenis.min.js"></script>
<script src="gsap.min.js"></script>
<script src="ScrollTrigger.min.js"></script>

<!-- 6. Main application logic -->
<script src="assets/js/main.js?v=7"></script>

<!-- 7. 3D Hero (ES module — deferred by default) -->
<script type="module" src="assets/js/hero-3d.js?v=107"></script>

<!-- 8. Year updater -->
<script>document.getElementById("year").textContent = new Date().getFullYear();</script>
```

---

## ⓫ Important: Do NOT Touch

- **velvetpremium.cl** — served by same Caddy instance, different reverse proxy. Do not modify Caddyfile sections for this domain.
- **`/var/www/dpzdata/assets/js/hero-3d-premium.js.bak`** — old version, safe to delete but kept for reference.
- **`/var/www/dpzdata/assets/models/`** — 3D models are NOT used (procedural instead). Safe to delete to save 171MB.

---

**Last updated**: July 27, 2026  
**Current versions**: hero-3d.js v110 | main.js v10 | style.css v28 | Caddy Caddyfile v2  
**Status**: Production stable. All pages load with HTTP 200. 3D scene renders correctly.
