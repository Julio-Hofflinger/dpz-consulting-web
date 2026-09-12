/* ==========================================================================
   DPZ Consulting — Hero 3D: Tierra + Satélite + Astronauta (modelos GLB)
   Three.js r164 (importmap) · OrbitControls + astronauta arrastrable
   Contrato con main.js:
     - dispatch 'hero3d:ready' y window.__hero3dReady = true (revela el texto)
     - window.setScrollProgress(progress) (zoom de cámara con scroll)
   ========================================================================== */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const CANVAS_SELECTOR = "#hero-canvas";
const MODELS = {
  earth: "assets/models/tierra_web.glb",
  satellite: "assets/models/simple_satellite_low_poly_free.glb",
  astronaut: "assets/models/astronaut_web_fixed.glb",
};

const EARTH_RADIUS = 3.1; // radio visual normalizado de la Tierra
const SAT_ORBIT_RADIUS = EARTH_RADIUS * 1.55;
const ASTRONAUT_HOME = new THREE.Vector3(3.5, 1.5, 3.0);
/* Bajo 900px el astronauta cae fuera del frustum: no vale sus 13 MB */
const LOAD_ASTRONAUT = window.innerWidth >= 900;
const ASTRONAUT_MAX_DIST = 7.5; // radio máximo de paseo del astronauta
const CAMERA_BASE_DIST = 12;

let scrollProgress = 0;

/* Normaliza un modelo a un tamaño objetivo y lo centra en su grupo */
function normalize(object, targetSize, mode = "radius") {
  const box = new THREE.Box3().setFromObject(object);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const size = box.getSize(new THREE.Vector3());
  const current =
    mode === "radius" ? sphere.radius : Math.max(size.x, size.y, size.z);
  if (current > 0) object.scale.multiplyScalar(targetSize / current);
  const center = sphere.center;
  object.position.sub(center);
  return object;
}

function setupScene(canvas) {
  const container = canvas.parentElement;

  /* --- Escena, cámara, render (fondo transparente → hereda CSS del hero) --- */
  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    500
  );
  camera.position.set(0, 1.6, CAMERA_BASE_DIST);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  /* --- Controles de cámara: rotar con damping; zoom desactivado para no
         secuestrar el scroll de la página ------------------------------- */
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableZoom = false; // la rueda hace scroll de la página
  controls.minDistance = 8; // límites por si se habilita zoom en el futuro
  controls.maxDistance = 20;
  controls.enablePan = false;
  controls.rotateSpeed = 0.5;
  controls.target.set(0, 0, 0);
  // En táctil: el arrastre vertical hace scroll de página, el horizontal orbita
  renderer.domElement.style.touchAction = "pan-y";
  controls.update();

  /* --- Luces --- */
  scene.add(new THREE.AmbientLight(0x445544, 1.1));
  const key = new THREE.DirectionalLight(0xffeedd, 2.6);
  key.position.set(5, 10, 7);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x4488ff, 0.8);
  fill.position.set(-5, 0, -10);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x88ffaa, 0.5);
  rim.position.set(0, -5, 5);
  scene.add(rim);

  /* --- Estrellas (1500) --- */
  const starCount = 1500;
  const starPos = new Float32Array(starCount * 3);
  const starCol = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 70 + Math.random() * 130;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPos[i * 3 + 2] = r * Math.cos(phi);
    const c = 0.6 + Math.random() * 0.4;
    starCol[i * 3] = c * 0.9;
    starCol[i * 3 + 1] = c;
    starCol[i * 3 + 2] = c;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(starCol, 3));
  // Sprite redondo para las estrellas (los puntos cuadrados se ven baratos)
  const starCanvas = document.createElement("canvas");
  starCanvas.width = starCanvas.height = 32;
  const sctx = starCanvas.getContext("2d");
  const grad = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.8)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 32, 32);
  const starTexture = new THREE.CanvasTexture(starCanvas);

  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      size: 0.55,
      map: starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      depthWrite: false,
    })
  );
  scene.add(stars);

  /* --- Grupo raíz: se desplaza a la derecha en desktop (texto a la izq.) --- */
  const worldGroup = new THREE.Group();
  scene.add(worldGroup);
  const earthGroup = new THREE.Group();
  const satelliteOrbitGroup = new THREE.Group();
  const astronautGroup = new THREE.Group();
  astronautGroup.position.copy(ASTRONAUT_HOME);
  worldGroup.add(earthGroup, satelliteOrbitGroup, astronautGroup);

  /* --- Cargadores GLTF/Draco --- */
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
  );
  loader.setDRACOLoader(draco);

  let earth = null;
  let mixer = null;
  let astronautBaseY = ASTRONAUT_HOME.y;
  let astronautHasAnim = false;

  loader.load(MODELS.earth, (gltf) => {
    earth = normalize(gltf.scene, EARTH_RADIUS, "radius");
    earthGroup.add(earth);
  });
  loader.load(MODELS.satellite, (gltf) => {
    const sat = normalize(gltf.scene, 0.9, "max");
    satelliteOrbitGroup.add(sat);
  });
  if (LOAD_ASTRONAUT) {
    loader.load(
      MODELS.astronaut,
      (gltf) => {
        const astro = normalize(gltf.scene, 1.7, "max");
        astronautGroup.add(astro);
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(astro);
          mixer.clipAction(gltf.animations[0]).play();
          astronautHasAnim = true;
        }
      },
      undefined,
      (err) => console.error("[Hero3D] Error cargando astronauta:", err)
    );
  }

  /* --- Arrastrar al astronauta con el ratón / dedo --- */
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let dragging = false;
  const prev = { x: 0, y: 0 };

  renderer.domElement.addEventListener("pointerdown", (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.intersectObjects(astronautGroup.children, true).length > 0) {
      dragging = true;
      prev.x = e.clientX;
      prev.y = e.clientY;
      controls.enabled = false;
      renderer.domElement.style.cursor = "grabbing";
    }
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    prev.x = e.clientX;
    prev.y = e.clientY;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3()
      .crossVectors(forward, new THREE.Vector3(0, 1, 0))
      .normalize();
    const factor = camera.position.distanceTo(astronautGroup.position) * 0.002;
    astronautGroup.position.x +=
      (right.x * dx + forward.x * dy) * factor;
    astronautGroup.position.z +=
      (right.z * dx + forward.z * dy) * factor;
    // Mantener al astronauta cerca de la Tierra
    if (astronautGroup.position.length() > ASTRONAUT_MAX_DIST) {
      astronautGroup.position.setLength(ASTRONAUT_MAX_DIST);
    }
  });
  const endDrag = () => {
    if (dragging) {
      dragging = false;
      controls.enabled = true;
      renderer.domElement.style.cursor = "";
    }
  };
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  /* --- Bucle de animación (siempre activo, sin pause por visibilidad) --- */
  let angle = 0;
  let time = 0;

  function animate() {
    requestAnimationFrame(animate);
    if (document.hidden) return;
    const delta = 0.016;
    time += delta;

    if (earth) {
      earth.rotation.y += 0.0022;
      earth.rotation.x = 0.41;
    }

    angle += 0.007;
    satelliteOrbitGroup.position.set(
      Math.cos(angle) * SAT_ORBIT_RADIUS,
      Math.sin(angle * 1.3) * 0.6,
      Math.sin(angle) * SAT_ORBIT_RADIUS
    );
    satelliteOrbitGroup.lookAt(0, 0, 0);

    // Astronauta: animación GLB o flotación procedural
    if (mixer) {
      mixer.update(delta);
    }
    if (!astronautHasAnim) {
      astronautGroup.position.y =
        astronautBaseY + Math.sin(time * 1.2) * 0.18;
      astronautGroup.rotation.y += 0.004;
    }

    stars.rotation.y += 0.00005;

    // Zoom de cámara según scroll (sin pelear con OrbitControls)
    const targetDist = CAMERA_BASE_DIST + scrollProgress * 4.5;
    const currentDist = camera.position.distanceTo(controls.target);
    camera.position
      .sub(controls.target)
      .setLength(currentDist + (targetDist - currentDist) * 0.06)
      .add(controls.target);

    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  /* --- Responsive --- */
  function layout() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    // Escena desplazada a la derecha en desktop, centrada en móvil
    if (w >= 900) {
      worldGroup.position.set(1.5, 0.5, 0);
    } else {
      worldGroup.position.set(0, 1.2, 0);
    }
  }
  layout();
  window.addEventListener("resize", layout);
}

export function initHero3D() {
  const canvas = document.querySelector(CANVAS_SELECTOR);
  if (!canvas) return;
  try {
    setupScene(canvas);
  } catch (err) {
    console.error("[Hero3D] init error:", err);
  }
  window.__hero3dReady = true;
  document.dispatchEvent(new CustomEvent("hero3d:ready"));
}

export function setScrollProgress(p) {
  scrollProgress = Math.min(Math.max(p || 0, 0), 1);
}
window.setScrollProgress = setScrollProgress;

/* Auto-init */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    if (
      document.querySelector(CANVAS_SELECTOR) &&
      !window.__hero3dPremiumInit
    ) {
      window.__hero3dPremiumInit = true;
      initHero3D();
    }
  });
} else {
  if (document.querySelector(CANVAS_SELECTOR) && !window.__hero3dPremiumInit) {
    window.__hero3dPremiumInit = true;
    initHero3D();
  }
}
