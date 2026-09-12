/* ==========================================================================
   DPZ Consulting — Satélite orbital + asistente
   Widget fijo abajo a la derecha. El satélite 3D reemplaza al que vivía en el
   hero; al pulsarlo abre un asistente que responde con información real del
   sitio (no inventa: si no encuentra respuesta, deriva a contacto).

   Los addons de Three (GLTFLoader, DRACOLoader) importan "three" por bare
   specifier, así que el importmap es obligatorio: se declara en las cinco
   páginas, no solo en index.html.
   ========================================================================== */
(function () {
  "use strict";

  const MODEL = "assets/models/simple_satellite_low_poly_free.glb";
  const TEXTURA_PLANETA = "assets/img/planeta/tierra.webp";

  /* ---------------------------------------------------------------------- */
  /* Base de conocimiento — extraída del contenido real del sitio            */
  /* ---------------------------------------------------------------------- */
  const KB = [
    {
      id: "servicios",
      keys: ["servicio", "servicios", "que hacen", "qué hacen", "ofrecen", "rubro", "especialidad", "trabajo"],
      chips: ["¿Qué servicios ofrecen?"],
      answer:
        "DPZ trabaja ocho líneas técnicas:<ul>" +
        "<li>Diagnóstico ambiental y territorial</li>" +
        "<li>Cartografía, SIG y datos territoriales</li>" +
        "<li>Gestión forestal y vegetacional</li>" +
        "<li>Soporte técnico-regulatorio sectorial</li>" +
        "<li>Reforestación, restauración y ejecución aplicada</li>" +
        "<li>Censo y caracterización de arbolado urbano</li>" +
        "<li>Suelos, fuego, riesgos y operación predial</li>" +
        "<li>Apoyo externo a consultoras</li></ul>",
      links: [["Ver servicios en detalle", "servicios.html"]],
    },
    {
      id: "diagnostico",
      keys: ["diagnostico", "diagnóstico", "linea base", "línea base", "caracterizacion", "caracterización", "predio"],
      chips: ["¿Qué incluye un diagnóstico?"],
      answer:
        "El diagnóstico ambiental y territorial es una caracterización integral del predio y su entorno: línea base ambiental, " +
        "análisis del territorio y evaluación de condiciones físicas, bióticas y normativas. Sirve como base técnica para " +
        "planificar, tramitar o defender un proyecto.",
      links: [["Ver el servicio", "servicios.html#servicios"]],
    },
    {
      id: "sig",
      keys: ["sig", "gis", "cartografia", "cartografía", "mapa", "mapas", "geo", "espacial", "zonificacion", "zonificación", "kmz", "kml"],
      chips: ["¿Hacen cartografía SIG?"],
      answer:
        "Sí. Producimos cartografía técnica y análisis espacial con SIG: mapas temáticos, zonificación, modelos de terreno y " +
        "estructuración de datos territoriales, para respaldar diagnósticos, planes y tramitaciones.",
      links: [["Ver cartografía y SIG", "servicios.html#servicios"]],
    },
    {
      id: "forestal",
      keys: ["forestal", "plan de manejo", "manejo", "bosque", "tala", "corta", "conaf", "vegetacional", "correccion", "corrección"],
      chips: ["¿Necesito un plan de manejo?"],
      answer:
        "Elaboramos planes de manejo simples, planes de corrección y manejo de cobertura vegetal, técnicamente sustentados y " +
        "defendibles ante la autoridad. Si vas a intervenir vegetación nativa, en general necesitas un instrumento aprobado " +
        "antes de ejecutar: conviene revisarlo caso a caso.",
      links: [["Guía: cuándo necesitas un plan de manejo", "blog/plan-de-manejo-forestal-cuando.html"]],
    },
    {
      id: "reforestacion",
      keys: ["reforestacion", "reforestación", "restauracion", "restauración", "plantacion", "plantación", "sobrevivencia", "vivero"],
      chips: ["¿Ejecutan reforestaciones?"],
      answer:
        "Sí, del plan a la implementación: diseñamos y supervisamos reforestaciones y restauración ecológica, asegurando " +
        "cumplimiento y sobrevivencia en terreno, no solo el documento.",
      links: [["Diseño de reforestaciones", "blog/diseno-reforestaciones-supervision.html"]],
    },
    {
      id: "arbolado",
      keys: ["arbolado", "arbol", "árbol", "arboles", "árboles", "censo", "urbano", "municipio", "municipal", "inventario"],
      chips: ["¿Hacen censo de arbolado urbano?"],
      answer:
        "Sí. Realizamos inventario y evaluación del arbolado urbano para gestión, planificación y toma de decisiones en " +
        "espacios públicos y privados. Es el instrumento base para municipios que necesitan priorizar mantención o reponer ejemplares.",
      links: [["Guía de censo de arbolado", "blog/censo-arbolado-urbano-guia.html"]],
    },
    {
      id: "regulatorio",
      keys: ["regulatorio", "observacion", "observación", "observaciones", "autoridad", "normativa", "permiso", "tramite", "trámite", "sea", "seia", "fiscalizacion", "fiscalización"],
      chips: ["Tengo observaciones de la autoridad"],
      answer:
        "Te acompañamos frente a la autoridad: revisamos, interpretamos y respondemos observaciones y requerimientos con " +
        "criterio regulatorio. La clave es responder con respaldo técnico y dentro de plazo, sin abrir frentes nuevos.",
      links: [["Cómo responder observaciones", "blog/observaciones-autoridad-proyecto.html"]],
    },
    {
      id: "incendios",
      keys: ["incendio", "incendios", "fuego", "riesgo", "suelo", "suelos", "erosion", "erosión", "cortafuego"],
      chips: ["¿Evalúan riesgo de incendios?"],
      answer:
        "Sí. Evaluamos condiciones del suelo, riesgo de incendios y variables operativas del predio para una gestión " +
        "territorial segura, incluyendo medidas de prevención aplicables en terreno.",
      links: [["Prevención de incendios prediales", "blog/riesgo-incendios-prediales-prevencion.html"]],
    },
    {
      id: "cobertura",
      keys: ["donde", "dónde", "cobertura", "region", "región", "regiones", "zona", "santiago", "chile", "viajan", "terreno"],
      chips: ["¿En qué zonas trabajan?"],
      answer:
        "Trabajamos en todo Chile, combinando terreno y trabajo remoto. La base está en la Región Metropolitana y " +
        "operamos habitualmente en las regiones aledañas.",
      links: [["Conócenos", "nosotros.html"]],
    },
    {
      id: "plazo",
      keys: ["plazo", "plazos", "cuanto demora", "cuánto demora", "tiempo", "demora", "responden", "respuesta", "urgente"],
      chips: ["¿En cuánto responden?"],
      answer:
        "Respondemos las solicitudes dentro de <strong>48 horas hábiles</strong>. El plazo de cada trabajo se define en la " +
        "propuesta, junto con el producto y el número de reuniones comprometidas.",
      links: [["Escríbenos", "contacto.html"]],
    },
    {
      id: "cotizacion",
      keys: ["cotizacion", "cotización", "cotizar", "precio", "presupuesto", "valor", "costo", "cuanto cuesta", "cuánto cuesta", "tarifa", "honorarios"],
      chips: ["¿Cómo pido una cotización?"],
      answer:
        "Cada cotización se arma según el proyecto e incluye:<ul>" +
        "<li>Producto y alcance definidos</li>" +
        "<li>Plazo y número de reuniones</li>" +
        "<li>Rondas de ajuste y exclusiones</li>" +
        "<li>Costos directos detallados aparte</li></ul>" +
        "Para prepararla nos sirve saber ubicación, superficie, objetivo y plazos. " +
        "No publicamos precios fijos porque dependen del alcance real.",
      links: [["Solicitar propuesta", "contacto.html#form"]],
    },
    {
      id: "contacto",
      keys: ["contacto", "contactar", "correo", "email", "mail", "telefono", "teléfono", "llamar", "whatsapp", "hablar", "reunion", "reunión"],
      chips: ["¿Cómo los contacto?"],
      answer:
        "Puedes escribirnos a <a href=\"mailto:contacto@dpzdata.com\">contacto@dpzdata.com</a> o llamar al " +
        "<a href=\"tel:+56962270739\">+56 9 6227 0739</a>. También puedes dejar tu requerimiento en el formulario y " +
        "adjuntar un KMZ, KML o PDF del predio.",
      links: [["Ir al formulario", "contacto.html#form"]],
    },
    {
      id: "empresa",
      keys: ["quienes son", "quiénes son", "empresa", "equipo", "nosotros", "experiencia", "dpz", "consultora", "significa"],
      chips: ["¿Quiénes son DPZ?"],
      answer:
        "DPZ es una consultora técnica ambiental, forestal y territorial. La sigla viene de <strong>Diagnóstico, " +
        "Planificación y Zonificación</strong> del territorio. Somos una empresa nueva, con un equipo que acumula " +
        "experiencia previa en proyectos forestales, ambientales y territoriales, y en tramitación sectorial ante la autoridad.",
      links: [["Conocer al equipo", "nosotros.html"]],
    },
    {
      id: "consultoras",
      keys: ["consultora", "consultoras", "apoyo externo", "subcontrato", "colaboracion", "colaboración", "peak", "capacidad"],
      chips: ["¿Trabajan con otras consultoras?"],
      answer:
        "Sí. Sumamos capacidad técnica especializada a otras consultoras y equipos, como soporte flexible en peaks de " +
        "trabajo o requerimientos puntuales.",
      links: [["Ver el servicio", "servicios.html#servicios"]],
    },
  ];

  const GREETINGS = ["hola", "buenas", "buenos dias", "buenos días", "buenas tardes", "hey", "que tal", "qué tal"];
  const THANKS = ["gracias", "muchas gracias", "genial", "perfecto", "ok", "vale"];

  function normalize(text) {
    return String(text).toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  }

  /* Puntúa cada entrada por coincidencia de claves; gana la de mayor puntaje.
     Se exige un mínimo para no responder cualquier cosa ante texto sin relación. */
  function findAnswer(query) {
    const q = normalize(query);
    if (!q) return null;
    if (GREETINGS.some((g) => q === normalize(g) || q.startsWith(normalize(g) + " "))) {
      return { greeting: true };
    }
    if (THANKS.some((t) => q === normalize(t))) return { thanks: true };

    let best = null;
    let bestScore = 0;
    for (const item of KB) {
      let score = 0;
      for (const key of item.keys) {
        const k = normalize(key);
        if (!k) continue;
        if (q === k) score += 6;
        else if (q.includes(k)) score += k.includes(" ") ? 4 : 3;
        else if (k.length > 4 && q.split(" ").some((w) => w.startsWith(k.slice(0, 5)))) score += 1;
      }
      if (score > bestScore) { bestScore = score; best = item; }
    }
    return bestScore >= 3 ? best : null;
  }

  /* ---------------------------------------------------------------------- */
  /* Interfaz                                                               */
  /* ---------------------------------------------------------------------- */
  const SUGGESTIONS = ["¿Qué servicios ofrecen?", "¿Cómo pido una cotización?", "¿En qué zonas trabajan?", "¿En cuánto responden?"];

  function build() {
    const root = document.createElement("div");
    root.className = "dpz-sat";
    root.innerHTML =
      '<button class="dpz-sat__launcher" type="button" aria-expanded="false" aria-controls="dpz-sat-panel" aria-label="Abrir asistente DPZ">' +
        '<span class="dpz-sat__canvas-wrap"><canvas class="dpz-sat__canvas" aria-hidden="true"></canvas></span>' +
        '<span class="dpz-sat__pulse" aria-hidden="true"></span>' +
      '</button>' +
      '<div class="dpz-sat__panel" id="dpz-sat-panel" role="dialog" aria-modal="false" aria-label="Asistente DPZ" hidden>' +
        '<header class="dpz-sat__head">' +
          '<div><strong>Asistente DPZ</strong><span>Respuestas sobre nuestros servicios</span></div>' +
          '<button class="dpz-sat__close" type="button" aria-label="Cerrar asistente">&times;</button>' +
        '</header>' +
        '<div class="dpz-sat__log" data-sat-log role="log" aria-live="polite"></div>' +
        '<div class="dpz-sat__chips" data-sat-chips></div>' +
        '<form class="dpz-sat__form" data-sat-form>' +
          '<label class="sr-only" for="dpz-sat-input">Escribe tu consulta</label>' +
          '<input id="dpz-sat-input" type="text" autocomplete="off" placeholder="Escribe tu consulta..." data-sat-input>' +
          '<button type="submit" aria-label="Enviar consulta">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</button>' +
        '</form>' +
      '</div>';
    document.body.appendChild(root);
    return root;
  }

  function init() {
    if (document.querySelector(".dpz-sat")) return;
    const root = build();
    const launcher = root.querySelector(".dpz-sat__launcher");
    const panel = root.querySelector(".dpz-sat__panel");
    const closeBtn = root.querySelector(".dpz-sat__close");
    const log = root.querySelector("[data-sat-log]");
    const chips = root.querySelector("[data-sat-chips]");
    const form = root.querySelector("[data-sat-form]");
    const input = root.querySelector("[data-sat-input]");
    let greeted = false;

    function bubble(html, who) {
      const el = document.createElement("div");
      el.className = "dpz-sat__msg dpz-sat__msg--" + who;
      el.innerHTML = html;
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
      return el;
    }

    function renderChips(list) {
      chips.innerHTML = "";
      list.forEach((text) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "dpz-sat__chip";
        b.textContent = text;
        b.addEventListener("click", () => ask(text));
        chips.appendChild(b);
      });
    }

    function linksMarkup(links) {
      if (!links || !links.length) return "";
      return '<span class="dpz-sat__links">' + links.map(
        ([label, href]) => `<a href="${href}">${label}</a>`
      ).join("") + "</span>";
    }

    function respond(query) {
      const hit = findAnswer(query);
      /* Pequeña espera: sin ella la respuesta aparece antes que la pregunta
         y se pierde la relación causa-efecto. */
      const typing = bubble('<span class="dpz-sat__typing"><i></i><i></i><i></i></span>', "bot");
      window.setTimeout(() => {
        typing.remove();
        if (hit && hit.greeting) {
          bubble("Hola. Puedo orientarte sobre servicios, plazos, cobertura y cómo pedir una propuesta. ¿Qué necesitas?", "bot");
        } else if (hit && hit.thanks) {
          bubble("A ti. Si quieres avanzar, cuéntanos tu proyecto y preparamos una propuesta técnica." +
            linksMarkup([["Cotiza tu proyecto", "contacto.html"]]), "bot");
        } else if (hit) {
          bubble(hit.answer + linksMarkup(hit.links), "bot");
        } else {
          bubble(
            "No tengo esa respuesta con precisión y prefiero no aventurarla. " +
            "Escríbenos y un especialista te responde dentro de 48 horas hábiles." +
            linksMarkup([["Ir al formulario", "contacto.html#form"], ["contacto@dpzdata.com", "mailto:contacto@dpzdata.com"]]),
            "bot"
          );
        }
        renderChips(SUGGESTIONS);
      }, 420);
    }

    function ask(text) {
      const value = String(text).trim();
      if (!value) return;
      bubble(value.replace(/[<>]/g, ""), "user");
      chips.innerHTML = "";
      input.value = "";
      respond(value);
    }

    function open() {
      panel.hidden = false;
      root.classList.add("is-open");
      launcher.setAttribute("aria-expanded", "true");
      launcher.setAttribute("aria-label", "Cerrar asistente DPZ");
      running = true; // reanudar animación del satélite
      if (!greeted) {
        greeted = true;
        bubble("Hola. Soy el asistente de DPZ Consulting. Respondo con información de este sitio sobre servicios, " +
               "plazos, cobertura y cotizaciones.", "bot");
        renderChips(SUGGESTIONS);
      }
      window.setTimeout(() => input.focus(), 60);
    }

    function close() {
      root.classList.remove("is-open");
      launcher.setAttribute("aria-expanded", "false");
      launcher.setAttribute("aria-label", "Abrir asistente DPZ");
      panel.hidden = true;
      running = false; // pausar animación del satélite
      launcher.focus();
    }

    launcher.addEventListener("click", () => (root.classList.contains("is-open") ? close() : open()));
    closeBtn.addEventListener("click", close);
    form.addEventListener("submit", (e) => { e.preventDefault(); ask(input.value); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && root.classList.contains("is-open")) close();
    });

    initSatellite(root.querySelector(".dpz-sat__canvas"));
  }

  /* ---------------------------------------------------------------------- */
  /* Satélite 3D                                                            */
  /* ---------------------------------------------------------------------- */
  async function initSatellite(canvas) {
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      canvas.closest(".dpz-sat__canvas-wrap").classList.add("is-static");
      return;
    }
    let THREE, GLTFLoader, DRACOLoader;
    try {
      THREE = await import("three");
      ({ GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js"));
      ({ DRACOLoader } = await import("three/addons/loaders/DRACOLoader.js"));
    } catch (err) {
      /* Sin WebGL o sin CDN el widget sigue siendo usable: queda el icono */
      canvas.closest(".dpz-sat__canvas-wrap").classList.add("is-static");
      return;
    }

    const size = 96;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch (err) {
      canvas.closest(".dpz-sat__canvas-wrap").classList.add("is-static");
      return;
    }
    renderer.setSize(size, size, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0.5, 8.8);
    camera.lookAt(0, 0, 0);

    /* Luz lateral marcada: es lo que da el terminador día/noche y hace que
       se lea como un planeta y no como un círculo plano. */
    scene.add(new THREE.AmbientLight(0x9fb8cc, 1.6));
    const sol = new THREE.DirectionalLight(0xfff4e2, 3.8);
    sol.position.set(4, 2.5, 3.5);
    scene.add(sol);
    const contra = new THREE.DirectionalLight(0x9fe870, 1.0);
    contra.position.set(-4, -1, -3);
    scene.add(contra);

    /* --- Planeta --- */
    const RADIO = 1.55;
    const planeta = new THREE.Mesh(
      new THREE.SphereGeometry(RADIO, 48, 48),
      new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 })
    );
    scene.add(planeta);

    new THREE.TextureLoader().load(TEXTURA_PLANETA, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      planeta.material.map = tex;
      planeta.material.needsUpdate = true;
    });

    /* Halo atmosférico: una esfera algo mayor vista del revés, que solo se
       ve en el borde. Sin esto la silueta queda recortada y dura. */
    const atmosfera = new THREE.Mesh(
      new THREE.SphereGeometry(RADIO * 1.09, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x7fc4ff, transparent: true, opacity: 0.18,
        side: THREE.BackSide, depthWrite: false,
      })
    );
    scene.add(atmosfera);

    /* --- Satélite en órbita --- */
    const orbita = new THREE.Group();
    /* Órbita inclinada: de canto no se apreciaría el paso por detrás */
    orbita.rotation.x = 0.42;
    orbita.rotation.z = 0.18;
    scene.add(orbita);

    const satelite = new THREE.Group();
    orbita.add(satelite);

    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
    loader.setDRACOLoader(draco);

    loader.load(MODEL, (gltf) => {
      const obj = gltf.scene;
      const box = new THREE.Box3().setFromObject(obj);
      const esfera = box.getBoundingSphere(new THREE.Sphere());
      if (esfera.radius > 0) {
        const escala = 0.60 / esfera.radius;
        obj.scale.multiplyScalar(escala);
        obj.position.sub(esfera.center.multiplyScalar(escala));
      }
      satelite.add(obj);
    }, undefined, () => {
      /* Sin satélite el planeta sigue girando: no se degrada a icono estático */
    });

    const RADIO_ORBITA = 2.45;
    let running = true;
    let t = 0;

    function frame() {
      if (!running) return;
      requestAnimationFrame(frame);
      if (document.hidden) return;
      t += 0.016;

      planeta.rotation.y += 0.0018;

      const ang = t * 0.55;
      const z = Math.cos(ang);
      satelite.position.set(Math.sin(ang) * RADIO_ORBITA, 0, z * RADIO_ORBITA);
      /* Se aleja al pasar por detrás: la perspectiva sola no basta a esta
         escala, así que se refuerza encogiéndolo en el tramo lejano.
         z = 1 delante, z = -1 detrás. */
      const lejania = (1 - z) / 2;            // 0 delante, 1 detrás
      satelite.scale.setScalar(1 - lejania * 0.42);
      satelite.rotation.y = -ang + Math.PI / 2;
      satelite.rotation.z = Math.sin(t * 0.8) * 0.12;

      renderer.render(scene, camera);
    }
    frame();

    window.addEventListener("pagehide", () => {
      running = false;
      planeta.geometry.dispose();
      planeta.material.map?.dispose();
      planeta.material.dispose();
      atmosfera.geometry.dispose();
      atmosfera.material.dispose();
      renderer.dispose();
    }, { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
