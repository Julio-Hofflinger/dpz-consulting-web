# Brainstorm: 3D Point Cloud Hero — DPZ Consulting

| Field | Value |
|-------|-------|
| **Date Started** | 2026-07-15 |
| **Status** | In Progress |
| **Current Phase** | alignment |
| **Last Updated** | 2026-07-15 04:30 |
| **Based On** | — |

---

## Original User Request

"poner algún efecto 3D, por ejemplo una nube de puntos que sea el logo de dpz y gire en un sentido pero a la vez se genere la ilusión óptica de que pueda girar en ambos sentidos a la vez"

---

## Phase A — Alignment

### Q1: Placement
**Options Presented:**
- A) Hero (reemplazar imagen actual)
- B) Fondo sutil overlay en Hero
- C) Sección dedicada nueva
- D) Preloader

**Decision:** A — Hero (reemplazar imagen actual)
**Rationale:** Máximo impacto visual, es lo primero que ve el visitante. Comunica "datos, tecnología, precisión" inmediatamente.
**Timestamp:** 2026-07-15

### Q2: Interaction Model
**Options Presented:**
- A) Rotación automática suave
- B) Sigue al mouse (parallax 3D)
- C) Ambas: auto-rotate + parallax sutil

**Decision:** C — Ambas
**Rationale:** La rotación automática genera la ilusión bidireccional; el parallax con mouse añade interactividad sin ser invasivo.
**Timestamp:** 2026-07-15

### Q3: Device Support
**Options Presented:**
- A) Desktop solamente
- B) Desktop + tablets
- C) Todos los dispositivos

**Decision:** C — Todos los dispositivos
**Rationale:** El usuario quiere que el efecto se vea en cualquier dispositivo.
**Timestamp:** 2026-07-15

### Q4: Loading Strategy
**Options Presented:**
- A) Reemplazar preloader con el 3D
- B) Aparece tras el preloader actual

**Decision:** A — Reemplazar preloader con el 3D
**Rationale:** Experiencia más fluida: el 3D aparece desde el primer momento como parte de la carga, luego el contenido se revela encima.
**Timestamp:** 2026-07-15

---

## Prototype Validation

Prototipo funcional creado en `prototipo-logo-3d.html` y desplegado en `https://dpzdata.com/prototipo-logo-3d.html`. Validado con el usuario: le gusta el efecto.

Componentes del prototipo:
- Nube de puntos del logo DPZ (sampleada desde `isologo-color.png`) con bloom/unreal bloom
- Dos anillos orbitales concéntricos girando en direcciones opuestas (generando ilusión bidireccional)
- Fondo de estrellas
- OrbitControls con auto-rotate
- Three.js + EffectComposer (bloom)

---

### Phase A → B Transition Confirmation [2026-07-15 04:30]

**Alignment Summary (compiled by agent):**
- Placement: Hero section, reemplazando la imagen estática actual
- Interacción: Auto-rotate + parallax sutil con mouse
- Dispositivos: Todos (desktop, tablet, mobile)
- Carga: Reemplaza el preloader actual con la nube 3D
- Tecnología: Three.js (CDN), EffectComposer, UnrealBloomPass
- Logo fuente: `assets/img/logos/isologo-color.png`
- Fondo fallback: imagen estática actual si JS no carga

**User Confirmation:** ✓ Confirmado
