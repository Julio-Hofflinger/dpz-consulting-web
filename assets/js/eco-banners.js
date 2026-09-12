/* ==========================================================================
   DPZ Consulting — Banners de ecosistema
   Adaptado del kit de banners interactivos:
   - Los anclajes apuntan a los IDs reales del sitio (#experiencia, #form,
     #articulos), no a los del kit, que no existían aquí.
   - El selector cambia además el tema global del sitio y lo persiste con la
     misma clave que ya usaba el selector flotante, ahora retirado.
   ========================================================================== */
(function () {
  "use strict";

  const THEME_KEY = "dpz-theme"; // misma clave que usa main.js

  /* Los archivos de escena conservan su nombre cuando cambia el contenido
     (sabana.webp pasó de la sabana africana a la faena de reforestación), así
     que sin este sufijo los navegadores siguen mostrando la versión antigua.
     Súbelo cada vez que reemplaces un vídeo o un póster. */
  const MEDIA_V = "5";

  const BIOMES = [
    { id: "bosque",    name: "Bosque",    accent: "#b8ef99", glow: "rgba(79,150,72,.35)" },
    { id: "humedal",   name: "Humedal",   accent: "#a9e4dc", glow: "rgba(39,139,152,.35)" },
    { id: "desierto",  name: "Desierto",  accent: "#edc78d", glow: "rgba(187,119,50,.34)" },
    { id: "altiplano", name: "Altiplano", accent: "#b8dfea", glow: "rgba(74,132,173,.34)" },
    /* Se muestra como "Espinal": el nombre chileno del paisaje de Acacia caven
       dispersa sobre pastizal seco. El id sigue siendo "sabana" porque gobierna
       la paleta [data-theme] del sitio y el nombre de los archivos. */
    { id: "sabana",    name: "Espinal",   accent: "#e8da8c", glow: "rgba(166,130,48,.34)" },
  ];

  const PAGES = {
    home: {
      top: {
        biome: "bosque", eyebrow: "Diagnóstico · Planificación · Zonificación",
        title: "Consultora Ambiental Forestal Chile", accentText: "Forestal Chile",
        description: "Consultora técnica ambiental, forestal y territorial. Convertimos datos, cartografía y criterio regulatorio en decisiones claras y defendibles.",
        ctaLabel: "Explorar servicios", ctaHref: "servicios.html",
        metaLabel: "Ecosistema", metaValue: "Gestión forestal",
      },
      bottom: {
        biome: "bosque", eyebrow: "Trabajemos juntos",
        title: "¿Tienes un desafío territorial?", accentText: "territorial?",
        description: "Cuéntanos tu proyecto y te entregamos una propuesta técnica clara, con producto, plazo y alcance definidos.",
        ctaLabel: "Cotiza tu proyecto", ctaHref: "contacto.html",
        metaLabel: "Respuesta", metaValue: "48 h hábiles",
      },
    },
    servicios: {
      top: {
        biome: "desierto", eyebrow: "Líneas de servicio",
        title: "Servicios técnicos para el territorio", accentText: "para el territorio",
        description: "Priorizamos servicios de alto valor técnico y ejecución precisa, con producto, plazo y alcance definidos.",
        ctaLabel: "Ver servicios", ctaHref: "#servicios",
        metaLabel: "Especialidad", metaValue: "Cartografía y SIG",
      },
      bottom: {
        biome: "desierto", eyebrow: "Siguiente paso",
        title: "Hablemos de tu proyecto", accentText: "tu proyecto",
        description: "Solicita una propuesta técnica ajustada a tus necesidades y plazos.",
        ctaLabel: "Cotiza tu proyecto", ctaHref: "contacto.html",
        metaLabel: "Cobertura", metaValue: "Todo Chile",
      },
    },
    nosotros: {
      top: {
        biome: "altiplano", eyebrow: "Quiénes somos",
        title: "Consultora técnica ambiental y territorial", accentText: "ambiental y territorial",
        description: "Integramos experiencia de terreno, análisis cartográfico y criterio regulatorio para resolver desafíos ambientales y territoriales.",
        ctaLabel: "Conoce nuestro enfoque", ctaHref: "#experiencia",
        metaLabel: "Enfoque", metaValue: "Criterio técnico",
      },
      bottom: {
        biome: "altiplano", eyebrow: "Trabajemos juntos",
        title: "Pongamos el criterio técnico a tu favor", accentText: "a tu favor",
        description: "Conversemos sobre tu desafío ambiental, forestal o territorial.",
        ctaLabel: "Contáctanos", ctaHref: "contacto.html",
        metaLabel: "Equipo", metaValue: "Experiencia aplicada",
      },
    },
    blog: {
      top: {
        biome: "sabana", eyebrow: "Perspectivas",
        title: "Conocimiento aplicado", accentText: "aplicado",
        description: "Artículos técnicos sobre diagnóstico, cartografía SIG, gestión forestal, reforestación y normativa ambiental y territorial en Chile.",
        ctaLabel: "Explorar artículos", ctaHref: "#articulos",
        metaLabel: "Contenido", metaValue: "Territorio y datos",
      },
      bottom: {
        biome: "sabana", eyebrow: "Trabajemos juntos",
        title: "¿Tienes un desafío territorial?", accentText: "territorial?",
        description: "Conversemos sobre tu proyecto y te entregamos una propuesta técnica clara.",
        ctaLabel: "Cotiza tu proyecto", ctaHref: "contacto.html",
        metaLabel: "Respuesta", metaValue: "48 h hábiles",
      },
    },
    contacto: {
      top: {
        biome: "humedal", eyebrow: "Hablemos",
        title: "Cotiza tu proyecto", accentText: "tu proyecto",
        description: "Cuéntanos qué necesitas y recibe una propuesta técnica clara, con producto, plazo y alcance definidos.",
        ctaLabel: "Ir al formulario", ctaHref: "#form",
        metaLabel: "Cobertura", metaValue: "Todo Chile",
      },
      bottom: {
        biome: "humedal", eyebrow: "Trabajemos juntos",
        title: "¿Tienes un desafío territorial?", accentText: "territorial?",
        description: "Nuestro equipo revisará tu requerimiento y preparará una propuesta con entregables, plazos y exclusiones claras.",
        ctaLabel: "Enviar mensaje", ctaHref: "#form",
        metaLabel: "Respuesta", metaValue: "48 h hábiles",
      },
    },
  };

  /* En producción Caddy sirve /servicios sin extensión, así que adivinar por
     pathname es frágil: cada página declara su clave en data-dpz-page. */
  function resolvePage() {
    const declared = document.body.dataset.dpzPage;
    if (declared && PAGES[declared]) return declared;
    const path = window.location.pathname.replace(/\.html$/, "").replace(/\/+$/, "") || "/";
    if (path === "/" || path.endsWith("/index")) return "home";
    const key = path.split("/").filter(Boolean).pop();
    return PAGES[key] ? key : "home";
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
  }

  function titleMarkup(title, accentText) {
    const safe = String(title);
    const i = safe.lastIndexOf(accentText);
    if (i < 0) return escapeHtml(safe);
    return escapeHtml(safe.slice(0, i)) + "<em>" + escapeHtml(accentText) + "</em>" + escapeHtml(safe.slice(i + accentText.length));
  }

  function buildScene(root) {
    root.querySelector("[data-eco-scene]").innerHTML =
      '<video class="eco-banner__video" muted loop playsinline preload="metadata">' +
      '<source type="video/webm"><source type="video/mp4"></video>' +
      '<div class="eco-banner__light"></div><div class="eco-banner__shade"></div>';
  }

  function syncPlayback(root) {
    const video = root.querySelector(".eco-banner__video");
    if (!video) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !root._visible || document.hidden) { video.pause(); return; }
    video.play().catch(() => undefined);
  }

  /* Ambos banners muestran la misma escena, así que en pantallas estrechas el
     inferior se queda solo con el póster: descargar y decodificar el mismo
     vídeo dos veces costaba el doble de datos y de batería en móvil. */
  const soloPoster = (root) =>
    root.dataset.ecoBanner === "bottom" && window.innerWidth < 900;

  function setVideo(root, biome) {
    const video = root.querySelector(".eco-banner__video");
    if (!video || video.dataset.biome === biome.id) return syncPlayback(root);
    const base = root._motionBase;
    video.pause();
    video.dataset.biome = biome.id;
    video.poster = `${base}/${biome.id}.webp?v=${MEDIA_V}`;

    const webm = video.querySelector('source[type="video/webm"]');
    const mp4 = video.querySelector('source[type="video/mp4"]');

    if (soloPoster(root)) {
      webm.removeAttribute("src");
      mp4.removeAttribute("src");
      video.removeAttribute("src");
      video.load();
      return;
    }

    webm.src = `${base}/${biome.id}.webm?v=${MEDIA_V}`;
    mp4.src = `${base}/${biome.id}.mp4?v=${MEDIA_V}`;
    video.load();
    syncPlayback(root);
  }

  function setBiome(root, id) {
    const biome = BIOMES.find((b) => b.id === id) || BIOMES[0];
    root.dataset.biome = biome.id;
    root.style.setProperty("--dpz-eco-accent", biome.accent);
    root.style.setProperty("--dpz-eco-glow", biome.glow);
    setVideo(root, biome);
    root.querySelectorAll("[data-eco-selector] button").forEach((btn) => {
      const active = btn.dataset.biome === biome.id;
      btn.classList.toggle("is-active", active);
      if (active) btn.setAttribute("aria-current", "true");
      else btn.removeAttribute("aria-current");
    });
  }

  /* El selector del banner sustituye al antiguo botón flotante: además de
     cambiar la escena, aplica la paleta a todo el sitio y la recuerda. */
  function setTheme(id) {
    document.querySelectorAll("[data-eco-banner]").forEach((b) => setBiome(b, id));
    document.documentElement.setAttribute("data-theme", id);
    const meta = document.querySelector('meta[name="theme-color"]');
    const palette = { bosque: "#1E4D2B", humedal: "#114B44", desierto: "#6B3F1D", altiplano: "#4A4A3A", sabana: "#5A5A1E" };
    if (meta && palette[id]) meta.setAttribute("content", palette[id]);
    try { localStorage.setItem(THEME_KEY, id); } catch (e) {}
  }

  function buildSelector(root) {
    const selector = root.querySelector("[data-eco-selector]");
    selector.innerHTML = BIOMES.map((b) =>
      `<button type="button" data-biome="${b.id}" aria-label="Mostrar ecosistema ${b.name}"><strong>${b.name}</strong><i></i></button>`
    ).join("");
    selector.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-biome]");
      if (btn) setTheme(btn.dataset.biome);
    });
  }

  function hydrate(root, config) {
    root._motionBase = (root.dataset.ecoMotion || "assets/cinemagraphs").replace(/\/$/, "");
    root._visible = !window.IntersectionObserver;
    root.querySelector("[data-eco-eyebrow]").textContent = config.eyebrow;
    root.querySelector("[data-eco-title]").innerHTML = titleMarkup(config.title, config.accentText);
    root.querySelector("[data-eco-description]").textContent = config.description;
    root.querySelector("[data-eco-cta]").href = config.ctaHref;
    root.querySelector("[data-eco-cta-label]").textContent = config.ctaLabel;
    root.querySelector("[data-eco-meta-label]").textContent = config.metaLabel;
    root.querySelector("[data-eco-meta-value]").textContent = config.metaValue;
    buildScene(root);
    buildSelector(root);
    if (window.IntersectionObserver) {
      const obs = new IntersectionObserver(([entry]) => {
        root._visible = entry.isIntersecting;
        syncPlayback(root);
      }, { rootMargin: "120px 0px" });
      obs.observe(root);
    }
  }

  function initParallax() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let tx = 0, ty = 0, x = 0, y = 0, raf = null;
    const move = (e) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const tick = () => {
      x += (tx - x) * 0.05;
      y += (ty - y) * 0.05;
      document.documentElement.style.setProperty("--dpz-mx", x.toFixed(4));
      document.documentElement.style.setProperty("--dpz-my", y.toFixed(4));
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", move, { passive: true });
    raf = requestAnimationFrame(tick);
    window.addEventListener("pagehide", () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
    }, { once: true });
  }

  function init() {
    const banners = document.querySelectorAll("[data-eco-banner]");
    if (!banners.length) return;
    const page = PAGES[resolvePage()];
    banners.forEach((root) => {
      const cfg = page[root.dataset.ecoBanner];
      if (cfg) hydrate(root, cfg);
    });

    /* Cada página abre con su propio ecosistema (Inicio bosque, Servicios
       desierto, Nosotros altiplano, Blog sabana, Contacto humedal): es la
       identidad editorial del kit. El cambio manual vale para la visita. */
    setTheme(page.top.biome);

    document.addEventListener("visibilitychange", () => {
      banners.forEach(syncPlayback);
    });
    initParallax();
  }

  function init() {
    const banners = document.querySelectorAll("[data-eco-banner]");
    if (!banners.length) return;
    const page = PAGES[resolvePage()];
    banners.forEach((root) => {
      const cfg = page[root.dataset.ecoBanner];
      if (cfg) hydrate(root, cfg);
    });

    /* Cada página abre con su propio ecosistema (Inicio bosque, Servicios
       desierto, Nosotros altiplano, Blog sabana, Contacto humedal): es la
       identidad editorial del kit. El cambio manual vale para la visita. */
    setTheme(page.top.biome);

    document.addEventListener("visibilitychange", () => {
      banners.forEach(syncPlayback);
    });
    initParallax();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
