# Spec: 3D Point Cloud Hero — DPZ Consulting

| Field | Value |
|-------|-------|
| **Date** | 2026-07-15 |
| **Status** | Draft |
| **Based on** | Brainstorm 2026-07-15-3d-hero-point-cloud |
| **Prototype** | `prototipo-logo-3d.html` |

---

## Problem

La página de inicio de DPZ Consulting usa una imagen estática de bosque como fondo del hero. No comunica de inmediato el perfil tecnológico/de datos de la consultora. Se necesita un elemento visual distintivo que transmita "diagnóstico, tecnología, precisión espacial" desde el primer segundo.

## Goals

1. Reemplazar la imagen estática del hero por una nube de puntos 3D del logo DPZ
2. El logo 3D gira automáticamente y responde sutilmente al mouse (parallax)
3. Dos anillos orbitales giran en direcciones opuestas creando ilusión óptica bidireccional
4. La nube 3D funciona como preloader: aparece al cargar, luego el contenido se revela encima
5. Funciona en todos los dispositivos (desktop, tablet, mobile)
6. Fallback: si JS no carga o hay error, se muestra la imagen estática actual
7. El texto del hero (título, descripción, tags, CTA) se superpone sobre el canvas 3D

## Non-Goals

- No reemplaza otros elementos visuales del sitio
- No afecta la accesibilidad del texto del hero (el canvas es decorativo)
- No añade dependencias pesadas: Three.js se carga desde CDN
- No modifica la estructura HTML del resto de la página

## Design Principles

1. **Progressive enhancement**: imagen estática como fallback base; Three.js se monta encima si está disponible
2. **Performance-first**: el canvas se crea solo cuando Three.js carga; densidad de puntos ajustable por viewport
3. **Subtle, not distracting**: movimiento lento y orgánico, sin parpadeos ni cambios bruscos
4. **Brand-aligned**: colores verdes de la paleta DPZ, el logo como fuente de los puntos

---

## Acceptance Scenarios

```gherkin
Feature: Hero 3D Point Cloud

  Scenario: El hero muestra la nube de puntos 3D al cargar
    Given que el usuario visita la página de inicio
    And Three.js se carga correctamente desde CDN
    When la página termina de cargar
    Then se muestra una nube de puntos con la forma del logo DPZ girando automáticamente
    And dos anillos orbitales giran en direcciones opuestas alrededor del logo
    And el texto del hero (título, descripción, CTA) se superpone correctamente sobre el canvas

  Scenario: Fallback a imagen estática si JS no carga
    Given que el usuario visita la página de inicio
    And Three.js no se carga (error de red, bloqueado, etc.)
    When la página se renderiza
    Then se muestra la imagen estática de bosque actual como fondo del hero
    And el hero se ve igual que antes de esta feature

  Scenario: El 3D responde al movimiento del mouse
    Given que el hero 3D está visible
    When el usuario mueve el mouse sobre el hero
    Then la nube de puntos se inclina sutilmente en dirección al cursor (parallax)
    And la rotación automática continúa

  Scenario: Funciona en dispositivos móviles
    Given que el usuario visita la página desde un teléfono
    When la página carga
    Then el canvas 3D se renderiza con densidad de puntos ajustada
    And el parallax está desactivado (solo auto-rotate)
    And el rendimiento es aceptable (30+ fps)

  Scenario: El 3D sustituye al preloader
    Given que el usuario visita la página de inicio
    When Three.js comienza a cargar
    Then el preloader actual NO se muestra
    And la nube 3D aparece como primer elemento visible
    And cuando el contenido está listo, el texto del hero se revela con fade-in sobre el canvas
```

---

## Design

### Architecture

```
index.html
├── <section class="hero">
│   ├── <div class="hero__media">           ← imagen estática (fallback)
│   │   └── <img src="...bosque.webp">
│   ├── <canvas id="hero-canvas">           ← insertado por JS
│   └── <div class="hero__content wrap">    ← texto (z-index sobre canvas)
│       ├── <h1>...</h1>
│       ├── <p class="hero__desc">...</p>
│       └── <a class="btn">...</a>
```

El canvas se inserta vía JS dentro de `.hero__media`, encima del `<img>`. Si JS falla, el `<img>` queda visible.

### Files

| File | Action | Description |
|------|--------|-------------|
| `index.html` | MODIFY | Remover preloader HTML; añadir `<canvas>` placeholder; modificar `<script>` tags |
| `assets/js/hero-3d.js` | CREATE | Todo el código Three.js: sampler de logo, scene, animación, resize, fallback |
| `assets/css/style.css` | MODIFY | Ajustar `.hero__media` para que canvas tenga `position:absolute;inset:0` |
| `assets/js/main.js` | MODIFY | Remover lógica del preloader antiguo; llamar a `initHero3D()` |
| `prototipo-logo-3d.html` | DELETE | Queda obsoleto tras integrar en index.html |

### Point Density Strategy

| Viewport | Step (sampling) | Point size | Approx points |
|----------|----------------|------------|---------------|
| Desktop (>1024px) | 3 | 0.025 | ~8,000 |
| Tablet (768-1024) | 4 | 0.022 | ~4,500 |
| Mobile (<768px) | 5 | 0.020 | ~3,000 |

### Loading Flow

1. `index.html` loads → `<img>` visible (fallback)
2. `hero-3d.js` module loads Three.js from CDN
3. If CDN loads OK → hide `<img>`, create canvas, sample logo, start animation
4. If CDN fails → `<img>` stays, no error
5. On animation ready → reveal `.hero__content` with GSAP fade-in
6. Continue with existing page init (Lenis, scroll reveals, etc.)

### Preloader Replacement

El preloader actual (`.preloader` con logo + barra de carga) se elimina. En su lugar:
- El canvas 3D se monta inmediatamente
- Mientras Three.js carga (CDN), se muestra el `<img>` fallback momentáneamente
- Cuando el 3D está listo, se hace fade del `<img>` al canvas
- El contenido del hero se revela con GSAP (misma animación de líneas actual)

### Parallax Implementation

```js
// Desktop only — mouse move sobre el hero
document.addEventListener('mousemove', (e) => {
  const x = (e.clientX / window.innerWidth - 0.5) * 2;
  const y = (e.clientY / window.innerHeight - 0.5) * 2;
  points.rotation.y += (x * 0.15 - points.rotation.y) * 0.05;
  points.rotation.x += (y * 0.08 - points.rotation.x) * 0.05;
});
```

En mobile: sin parallax, solo auto-rotate.

---

## Implementation Phases

### Phase 1: Core Module (hero-3d.js)
- Crear `assets/js/hero-3d.js` con toda la lógica Three.js
- Sampler de logo, scene setup, bloom, anillos, animación
- Exportar `initHero3D(canvasSelector)` como entry point

### Phase 2: HTML + CSS Integration
- Modificar `index.html`: remover preloader, añadir canvas
- Ajustar CSS: `.hero__media` para soportar canvas absoluto
- Añadir script tag para hero-3d.js (type="module")

### Phase 3: Preloader Replacement
- Modificar `main.js`: remover lógica de preloader
- Llamar a `initHero3D()` antes de `revealHero()`
- Sincronizar: el reveal del contenido espera a que el 3D esté listo

### Phase 4: Mobile Optimization
- Ajustar densidad de puntos por viewport
- Desactivar parallax en touch devices
- Testear rendimiento en dispositivos reales

---

## Testing Strategy

1. **Functional**: abrir index.html en Chrome/Firefox/Safari → verificar que el 3D aparece
2. **Fallback**: bloquear CDN de Three.js → verificar que se muestra la imagen estática
3. **Mobile**: Chrome DevTools device emulation → verificar rendimiento y densidad
4. **Performance**: Lighthouse audit → el LCP no debe degradarse significativamente
5. **Preloader**: hard reload → verificar que el viejo preloader no aparece

---

## Out of Scope

- Otros efectos 3D en otras páginas
- Personalización del 3D por tema (los temas de color no afectan al canvas)
- Carga de modelos 3D externos (GLTF/GLB)
- WebGPU (Three.js WebGL es suficiente)
