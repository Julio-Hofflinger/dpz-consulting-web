/* ==========================================================================
   DPZ Consulting — Interacciones Premium
   Hero 3D Premium (Crystal + Terrain + Caustics) · Lenis · GSAP · ScrollTrigger
   ========================================================================== */
(function () {
  "use strict";

  const doc = document.documentElement;
  doc.classList.remove("no-js");
  doc.classList.add("js");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = typeof window.gsap !== "undefined";
  const hasLenis = typeof window.Lenis !== "undefined";
  let hero3dReady = false;

  /* ---------------------------------------------------------------------- */
  /* 0. Selector de variante cromática (temas de marca)                     */
  /* ---------------------------------------------------------------------- */
  const THEMES = [
    { id: "bosque",    name: "Bosque",    eco: "Vegetación densa", c: ["#1E4D2B", "#6BAA27", "#A9C73F"] },
    { id: "humedal",   name: "Humedal",   eco: "Ribera",           c: ["#114B44", "#2E8B7C", "#8FD3C4"] },
    { id: "desierto",  name: "Desierto",  eco: "Suelo árido",      c: ["#6B3F1D", "#C97D3E", "#E8B771"] },
    { id: "altiplano", name: "Altiplano", eco: "Montaña",          c: ["#4A4A3A", "#8C8C6D", "#C9C9A8"] },
    { id: "sabana",    name: "Espinal",   eco: "Espino y pastizal",         c: ["#5A5A1E", "#A6A63D", "#D9D97A"] },
  ];
  const THEME_KEY = "dpz-theme";
  const DEFAULT_THEME = "bosque";

  function getSavedTheme() {
    try {
      const t = localStorage.getItem(THEME_KEY);
      return THEMES.some((x) => x.id === t) ? t : DEFAULT_THEME;
    } catch (e) { return DEFAULT_THEME; }
  }
  function applyTheme(id) {
    doc.setAttribute("data-theme", id);
    const meta = document.querySelector('meta[name="theme-color"]');
    const theme = THEMES.find((t) => t.id === id);
    if (meta && theme) meta.setAttribute("content", theme.c[0]);
    try { localStorage.setItem(THEME_KEY, id); } catch (e) {}
  }
  applyTheme(getSavedTheme());

  /* El selector flotante de variantes se retiró: ahora el selector de
     ecosistemas de los banners cambia el tema del sitio (eco-banners.js).
     applyTheme() se conserva porque aplica el tema guardado al cargar. */

  /* ---------------------------------------------------------------------- */
  /* 1. Smooth scroll (Lenis) sincronizado con GSAP ScrollTrigger           */
  /* ---------------------------------------------------------------------- */
  let lenis = null;
  function initLenis() {
    if (!hasLenis || reduceMotion) return;
    lenis = new Lenis({
      duration: 0.35,
      easing: (t) => t,
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.6,
    });

    if (hasGSAP && window.ScrollTrigger) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    window.__lenis = lenis;
  }

  /* ---------------------------------------------------------------------- */
  /* 2. Hero 3D Premium — escucha el evento de carga                       */
  /* ---------------------------------------------------------------------- */
  function initHero3D() {
    /* páginas sin el canvas 3D: revelar de inmediato */
    if (!document.querySelector("#hero-canvas")) {
      hero3dReady = true;
      revealHero();
      return;
    }
    /* hero-3d.js (módulo) dispara 'hero3d:ready' o marca __hero3dReady */
    if (window.__hero3dReady) {
      hero3dReady = true;
      revealHero();
      return;
    }
    document.addEventListener('hero3d:ready', () => {
      if (hero3dReady) return;
      hero3dReady = true;
      revealHero();
    }, { once: true });
    /* safety timeout: si el 3D nunca carga, mostrar hero igual */
    setTimeout(() => {
      if (!hero3dReady) {
        hero3dReady = true;
        document.body.style.visibility = 'visible';
        revealHero();
      }
    }, 4000);
  }

  /* ---------------------------------------------------------------------- */
  /* 3. Animación del hero (líneas del título)                              */
  /* ---------------------------------------------------------------------- */
  const preloaderStart = performance.now();
  function hidePreloader() {
    const p = document.getElementById("preloader");
    if (!p) return;
    const MIN_SHOW = 900;
    const wait = Math.max(0, MIN_SHOW - (performance.now() - preloaderStart));
    setTimeout(() => p.classList.add("is-done"), wait);
  }

  function revealHero() {
    hidePreloader();
    const lines = document.querySelectorAll(".hero__title .line > span");
    const extras = document.querySelectorAll("[data-hero-fade]");
    if (!hasGSAP || reduceMotion) {
      lines.forEach((l) => (l.style.transform = "none"));
      extras.forEach((e) => { e.style.opacity = 1; e.style.transform = "none"; });
      return;
    }
    if (lines.length) {
      gsap.set(lines, { yPercent: 110 });
      gsap.to(lines, { yPercent: 0, duration: 1.1, stagger: 0.1, ease: "expo.out" });
    }
    if (extras.length) {
      gsap.fromTo(extras, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 1, stagger: 0.12, ease: "power3.out", delay: 0.35 });
    }
  }

  /* ---------------------------------------------------------------------- */
  /* 4. Reveals on-scroll (Premium)                                         */
  /* ---------------------------------------------------------------------- */
  function initReveals() {
    if (!hasGSAP || !window.ScrollTrigger || reduceMotion) {
      document.querySelectorAll("[data-reveal]").forEach((el) => { el.style.opacity = 1; el.style.transform = "none"; });
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    // Individual reveals: entra enfocándose, no solo apareciendo
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      const delay = parseFloat(el.dataset.reveal) || 0;
      gsap.fromTo(el,
        { filter: "blur(9px)" },
        {
          opacity: 1, y: 0, filter: "blur(0px)",
          duration: 1.05, delay, ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
          onComplete: () => { el.style.filter = ""; el.style.willChange = ""; },
        }
      );
    });

    // Staggered group reveals: escalonado con leve profundidad
    document.querySelectorAll("[data-reveal-group]").forEach((group) => {
      const items = group.querySelectorAll("[data-reveal-item]");
      gsap.set(items, { opacity: 0, y: 46, scale: 0.975, filter: "blur(10px)" });
      gsap.to(items, {
        opacity: 1, y: 0, scale: 1, filter: "blur(0px)",
        duration: 1, stagger: 0.1, ease: "expo.out",
        scrollTrigger: { trigger: group, start: "top 84%" },
        onComplete: () => items.forEach((i) => { i.style.filter = ""; i.style.willChange = ""; }),
      });
    });

    // Parallax on marked images
    document.querySelectorAll("[data-parallax]").forEach((el) => {
      gsap.fromTo(el, { yPercent: -8 }, {
        yPercent: 8, ease: "none",
        scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true },
      });
    });

    // Scroll-driven 3D animations (Hero Premium)
    if (window.setScrollProgress && hasGSAP) {
      const hero = document.querySelector(".hero");
      if (hero) {
        ScrollTrigger.create({
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: 1,
          onUpdate: (self) => {
            window.setScrollProgress(self.progress);
            // Notify GSAP ScrollTrigger of Lenis scroll
            if (lenis) ScrollTrigger.update();
          },
        });
      }
    }
  }

  /* ---------------------------------------------------------------------- */
  /* 5. Contadores animados (Our Numbers)                                   */
  /* ---------------------------------------------------------------------- */
  function initCounters() {
    const nums = document.querySelectorAll("[data-count]");
    if (!nums.length) return;

    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const dur = 1800;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.floor(eased * target).toLocaleString("es-CL");
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target.toLocaleString("es-CL");
      };
      requestAnimationFrame(step);
    };

    if (reduceMotion || !window.ScrollTrigger) {
      nums.forEach(run);
      return;
    }
    nums.forEach((el) => {
      ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: () => run(el) });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 6. Header: cambio de estado al hacer scroll                            */
  /* ---------------------------------------------------------------------- */
  function initHeader() {
    const header = document.querySelector(".header");
    if (!header || header.classList.contains("header--solid")) return;
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset;
      header.classList.toggle("is-scrolled", y > 60);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------------------------------------------------------------- */
  /* 7. Menú móvil                                                          */
  /* ---------------------------------------------------------------------- */
  function initMobileNav() {
    const burger = document.querySelector(".burger");
    const body = document.body;
    if (!burger) return;
    const links = document.querySelectorAll(".mobile-nav a");
    const toggle = (open) => {
      const isOpen = open ?? !body.classList.contains("is-menu-open");
      body.classList.toggle("is-menu-open", isOpen);
      burger.setAttribute("aria-expanded", String(isOpen));
      if (lenis) isOpen ? lenis.stop() : lenis.start();
    };
    burger.addEventListener("click", () => toggle());
    links.forEach((a) => a.addEventListener("click", () => toggle(false)));
  }

  /* ---------------------------------------------------------------------- */
  /* 8. Anclas internas con Lenis                                           */
  /* ---------------------------------------------------------------------- */
  function initAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      a.addEventListener("click", (e) => {
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(target, { offset: -80 });
        else target.scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 9. Formulario de contacto con envío real y archivo adjunto             */
  /* ---------------------------------------------------------------------- */
  function initForm() {
    const form = document.querySelector("[data-contact-form]");
    if (!form) return;
    const ok = form.querySelector(".form-ok");
    const btn = form.querySelector('button[type="submit"]');
    const btnHTML = btn ? btn.innerHTML : "";
    const MAX_FILE_BYTES = 10 * 1024 * 1024;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      /* novalidate desactiva el aviso nativo: lo pedimos explícitamente */
      if (!form.reportValidity()) return;

      const file = form.querySelector('[type="file"]')?.files?.[0];
      if (file && file.size > MAX_FILE_BYTES) {
        alert("El archivo supera los 10 MB. Envíalo a contacto@dpzdata.com o comparte un enlace.");
        return;
      }

      if (btn) { btn.disabled = true; btn.textContent = "Enviando..."; }

      try {
        const data = new FormData(form);
        const resp = await fetch(form.action, { method: "POST", body: data, headers: { "Accept": "application/json" } });
        if (resp.ok) {
          if (ok) ok.classList.add("show");
          form.querySelectorAll("input, textarea, select").forEach((f) => { if (f.type !== "file") f.value = ""; });
          const fileInput = form.querySelector('[type="file"]');
          if (fileInput) fileInput.value = "";
        } else {
          alert("Hubo un error al enviar el formulario. Por favor, escribe a contacto@dpzdata.com directamente.");
        }
      } catch (err) {
        alert("Hubo un error de conexión. Por favor, escribe a contacto@dpzdata.com directamente.");
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = btnHTML; }
      }
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 9b. Filtro de categorías del blog                                      */
  /* ---------------------------------------------------------------------- */
  function initBlogFilter() {
    const filters = document.querySelectorAll("[data-filter]");
    const cards = document.querySelectorAll("[data-cat]");
    if (!filters.length || !cards.length) return;
    filters.forEach((btn) => {
      btn.addEventListener("click", () => {
        const cat = btn.dataset.filter;
        filters.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        cards.forEach((card) => {
          const show = cat === "all" || card.dataset.cat === cat;
          card.style.display = show ? "" : "none";
        });
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 9c. Materiales glossy: reflejo que sigue el cursor + inclinación 3D    */
  /* ---------------------------------------------------------------------- */
  const GLOSS_TARGETS = [
    ".svc-card-3d", ".blog-card-3d", ".team-card-3d", ".stat-card-3d",
    ".glass-card-3d", ".svc-card", ".market", ".post", ".step",
    ".mv-card", ".contact-info__item", ".svc-row",
  ].join(",");

  function initGlossySurfaces() {
    const cards = document.querySelectorAll(GLOSS_TARGETS);
    if (!cards.length) return;

    /* Táctil y movimiento reducido: el reflejo sin cursor solo estorba */
    const pointerFine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (reduceMotion || !pointerFine) return;

    cards.forEach((card) => {
      card.classList.add("has-gloss", "tilt-3d");
      const layer = document.createElement("span");
      layer.className = "gloss";
      layer.setAttribute("aria-hidden", "true");
      card.appendChild(layer);

      /* Un rAF por tarjeta: el pointermove dispara mucho más rápido que
         el repintado y escribir estilos en cada evento provoca jank. */
      let frame = null;
      let last = null;

      /* El transform va inline, no por clase: GSAP deja su propio transform
         inline tras el reveal y una regla del stylesheet nunca lo ganaría. */
      const REST = "perspective(1100px) rotateX(0deg) rotateY(0deg) translate3d(0,0,0)";

      const paint = () => {
        frame = null;
        if (!last) return;
        const { px, py } = last;
        card.style.setProperty("--mx", `${px * 100}%`);
        card.style.setProperty("--my", `${py * 100}%`);
        card.classList.add("is-tilting"); // sigue al cursor 1:1, sin easing
        card.style.transform =
          `perspective(1100px) rotateX(${(0.5 - py) * 7}deg) ` +
          `rotateY(${(px - 0.5) * 7}deg) translate3d(0,-8px,0)`;
      };

      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        last = {
          px: (e.clientX - r.left) / r.width,
          py: (e.clientY - r.top) / r.height,
        };
        if (frame === null) frame = requestAnimationFrame(paint);
      });

      card.addEventListener("pointerleave", () => {
        if (frame !== null) { cancelAnimationFrame(frame); frame = null; }
        last = null;
        card.classList.remove("is-tilting"); // reactiva el easing de salida
        /* Reposo explícito: limpiar el inline devolvería la tarjeta al
           translateY(40px) que [data-reveal] define en el CSS base. */
        card.style.transform = REST;
      });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 10. Magnetic Buttons & Glass Card Interactions                         */
  /* ---------------------------------------------------------------------- */
  function initPremiumInteractions() {
    if (reduceMotion || !hasGSAP) return;

    // Magnetic buttons (el HTML usa .magnetic; .btn--magnetic es el alias del CSS)
    document.querySelectorAll(".magnetic, .btn--magnetic").forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(btn, { x: x * 0.3, y: y * 0.3, duration: 0.3, ease: "power3.out" });
      });
      btn.addEventListener("mouseleave", () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.5)" });
      });
    });

    /* El tilt de .glass-card-3d lo maneja ahora initGlossySurfaces (9c):
       tener dos manos escribiendo transform sobre el mismo nodo se pisaba. */

    // Particle trail on magnetic elements
    let trail = null;
    function createTrail() {
      trail = document.createElement("div");
      trail.className = "particle-trail";
      document.body.appendChild(trail);
    }
    document.querySelectorAll(".magnetic, .btn--magnetic, .glass-card-3d, .nav__link").forEach((el) => {
      el.addEventListener("mouseenter", () => {
        if (!trail) createTrail();
        trail.classList.add("active");
      });
      el.addEventListener("mousemove", (e) => {
        if (trail) {
          trail.style.left = e.clientX + "px";
          trail.style.top = e.clientY + "px";
        }
      });
      el.addEventListener("mouseleave", () => {
        if (trail) trail.classList.remove("active");
      });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 11. Scroll Progress Indicator                                          */
  /* ---------------------------------------------------------------------- */
  function initScrollProgress() {
    const progress = document.createElement("div");
    progress.className = "scroll-progress";
    document.body.appendChild(progress);

    window.addEventListener("scroll", () => {
      const scrollTop = window.scrollY || window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progressPct = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
      progress.style.transform = `scaleX(${progressPct})`;
    }, { passive: true });
  }

  /* ---------------------------------------------------------------------- */
  /* Init all                                                               */
  /* ---------------------------------------------------------------------- */
  function init() {
    document.body.style.visibility = "visible";
    initLenis();
    initHeader();
    initMobileNav();
    initAnchors();
    initReveals();
    initCounters();
    initForm();
    initBlogFilter();
    initHero3D();
    initGlossySurfaces();
    initPremiumInteractions();
    initScrollProgress();
    if (hasGSAP && window.ScrollTrigger) {
      window.addEventListener("load", () => ScrollTrigger.refresh());
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();