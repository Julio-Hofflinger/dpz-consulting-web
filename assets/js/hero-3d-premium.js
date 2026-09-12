/* ==========================================================================
   DPZ Consulting — Hero 3D Premium
   Earth Model + Satellite Model + Improved Orbit + Post-processing
   Dependencies: Three.js (import map), GSAP, Lenis
   ========================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';

const LOGO_SRC = 'assets/img/logos/isologo-color.png';
const EARTH_MODEL = 'assets/models/earth_-_16k_high_resolution.glb';
const SATELLITE_MODEL = 'assets/models/simple_satellite_low_poly_free.glb';
const FALLBACK_IMG_SELECTOR = '.hero__media img';
const HERO_CONTENT_SELECTOR = '.hero__content';
const CANVAS_SELECTOR = '#hero-canvas';
const LOADED_EVENT = 'hero3d:ready';

let scene, camera, renderer, composer;
let earthMesh, satelliteMesh, terrainMesh, causticsMesh, particleSystem;
let mouseX = 0, mouseY = 0;
let targetRX = 0, targetRY = 0;
let isMobile = false;
let disposed = false;
let paused = false;
let qualityTier = 'high';
let scrollProgress = 0;
let frameCount = 0;
let lastTime = performance.now();
let fps = 60;

/* ---------------------------------------------------------------------- */
/* Quality Detection & Config                                              */
/* ---------------------------------------------------------------------- */
function detectQualityTier() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'low';
  
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const connection = navigator.connection || {};
  const slowConnection = connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
  
  if (isMobile || mem < 4 || cores < 4 || slowConnection) return 'low';
  if (mem < 8 || cores < 8) return 'medium';
  return 'high';
}

function getQualityConfig() {
  const configs = {
    high: {
      particles: 5000,
      bloomStrength: 0.8,
      bloomRadius: 0.4,
      bloomThreshold: 0.85,
      caustics: true,
      terrainResolution: 128,
      envMapResolution: 512,
      enableChromaticAberration: true,
      enableFilmGrain: true,
      enableVignette: true,
      shadowMapSize: 2048,
      maxFPS: 60,
      orbitParticles: 200,
      orbitRings: 4,
    },
    medium: {
      particles: 2000,
      bloomStrength: 0.6,
      bloomRadius: 0.3,
      bloomThreshold: 0.9,
      caustics: false,
      terrainResolution: 64,
      envMapResolution: 256,
      enableChromaticAberration: false,
      enableFilmGrain: false,
      enableVignette: true,
      shadowMapSize: 1024,
      maxFPS: 60,
      orbitParticles: 100,
      orbitRings: 3,
    },
    low: {
      particles: 500,
      bloomStrength: 0,
      bloomRadius: 0,
      bloomThreshold: 1,
      caustics: false,
      terrainResolution: 32,
      envMapResolution: 128,
      enableChromaticAberration: false,
      enableFilmGrain: false,
      enableVignette: false,
      shadowMapSize: 512,
      maxFPS: 30,
      orbitParticles: 50,
      orbitRings: 2,
    }
  };
  return configs[qualityTier] || configs.medium;
}

const config = getQualityConfig();

/* ---------------------------------------------------------------------- */
/* Performance Monitor                                                     */
/* ---------------------------------------------------------------------- */
function updateFPS() {
  frameCount++;
  const now = performance.now();
  if (now - lastTime >= 1000) {
    fps = frameCount;
    frameCount = 0;
    lastTime = now;
    
    if (qualityTier !== 'low' && fps < 45 && config.maxFPS >= 60) {
      console.warn('[Hero3D] Low FPS detected, consider reducing quality');
    }
  }
}

/* ---------------------------------------------------------------------- */
/* Helpers                                                                 */
/* ---------------------------------------------------------------------- */
function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function getViewportSize() {
  const heroMedia = document.querySelector('.hero__media');
  if (heroMedia) {
    const rect = heroMedia.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  }
  return { w: window.innerWidth, h: window.innerHeight };
}

function notifyReady() {
  window.__hero3dReady = true;
  document.dispatchEvent(new CustomEvent(LOADED_EVENT));
  document.body.style.visibility = 'visible';
}

/* ---------------------------------------------------------------------- */
/* Dynamic Quality Adjustment                                              */
/* ---------------------------------------------------------------------- */
export function setQualityTier(tier) {
  if (['high', 'medium', 'low'].includes(tier) && tier !== qualityTier) {
    qualityTier = tier;
    Object.assign(config, getQualityConfig());
    if (scene) dispose();
    initHero3D();
  }
}

export function getQualityTier() { return qualityTier; }
export function getCurrentFPS() { return fps; }

/* ---------------------------------------------------------------------- */
/* Earth Model Loading                                                     */
/* ---------------------------------------------------------------------- */
async function loadEarthModel() {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(EARTH_MODEL, (gltf) => {
      const earthGroup = gltf.scene;
      
      // Apply crystal material to all meshes
      const theme = document.documentElement.getAttribute('data-theme') || 'bosque';
      const themeColors = {
        bosque: { primary: 0x1E4D2B, secondary: 0x6BAA27, accent: 0xA9C73F },
        humedal: { primary: 0x114B44, secondary: 0x2E8B7C, accent: 0x8FD3C4 },
        desierto: { primary: 0x6B3F1D, secondary: 0xC97D3E, accent: 0xE8B771 },
        altiplano: { primary: 0x4A4A3A, secondary: 0x8C8C6D, accent: 0xC9C9A8 },
        sabana: { primary: 0x5A5A1E, secondary: 0xA6A63D, accent: 0xD9D97A },
      };
      const c = themeColors[theme] || themeColors.bosque;
      
      // Create crystal material
      const crystalMaterial = new THREE.MeshPhysicalMaterial({
        color: c.primary,
        metalness: 0,
        roughness: 0.05,
        transmission: 0.9,
        thickness: 0.8,
        ior: 1.52,
        envMapIntensity: 1.8,
        clearcoat: 1,
        clearcoatRoughness: 0.01,
        sheen: 0.4,
        sheenColor: c.accent,
        iridescence: 0.35,
        iridescenceIOR: 1.3,
        iridescenceThicknessRange: [100, 400],
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });
      
      earthGroup.traverse((child) => {
        if (child.isMesh) {
          child.material = crystalMaterial;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      // Add inner glow core
      const coreGeo = new THREE.SphereGeometry(0.8, 32, 32);
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: c.accent,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const core = new THREE.Mesh(coreGeo, coreMaterial);
      core.renderOrder = -1;
      earthGroup.add(core);
      earthGroup.userData.core = core;
      
      // Add atmospheric glow layer
      const atmoGeo = new THREE.SphereGeometry(1.15, 64, 64);
      const atmoMaterial = new THREE.MeshBasicMaterial({
        color: c.accent,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide,
      });
      const atmosphere = new THREE.Mesh(atmoGeo, atmoMaterial);
      earthGroup.add(atmosphere);
      earthGroup.userData.atmosphere = atmosphere;
      
      resolve(earthGroup);
    }, undefined, reject);
  });
}

/* ---------------------------------------------------------------------- */
/* Satellite Model Loading                                                 */
/* ---------------------------------------------------------------------- */
async function loadSatelliteModel() {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(SATELLITE_MODEL, (gltf) => {
      const satelliteGroup = gltf.scene;
      
      // Scale satellite appropriately
      satelliteGroup.scale.setScalar(0.4);
      
      // Apply satellite material
      const theme = document.documentElement.getAttribute('data-theme') || 'bosque';
      const themeColors = {
        bosque: { secondary: 0x6BAA27, accent: 0xA9C73F },
        humedal: { secondary: 0x2E8B7C, accent: 0x8FD3C4 },
        desierto: { secondary: 0xC97D3E, accent: 0xE8B771 },
        altiplano: { secondary: 0x8C8C6D, accent: 0xC9C9A8 },
        sabana: { secondary: 0xA6A63D, accent: 0xD9D97A },
      };
      const c = themeColors[document.documentElement.getAttribute('data-theme') || 'bosque'];
      
      const satMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x222222,
        metalness: 0.8,
        roughness: 0.15,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1.5,
        emissive: c.secondary,
        emissiveIntensity: 0.3,
        sheen: 0.5,
        sheenColor: c.accent,
        iridescence: 0.3,
        iridescenceIOR: 1.35,
      });
      
      satelliteGroup.traverse((child) => {
        if (child.isMesh) {
          child.material = satMaterial;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      // Add engine glow
      const engineGeo = new THREE.SphereGeometry(0.12, 16, 16);
      const engineMat = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const engineGlow = new THREE.Mesh(engineGeo, engineMat);
      engineGlow.position.set(0, -0.3, -0.8);
      satelliteGroup.add(engineGlow);
      satelliteGroup.userData.engineGlow = engineGlow;
      
      resolve(satelliteGroup);
    }, undefined, reject);
  });
}

/* ---------------------------------------------------------------------- */
/* Orbit Visuals                                                           */
/* ---------------------------------------------------------------------- */
function createOrbitVisuals(c) {
  const orbitGroup = new THREE.Group();
  
  // Multiple elliptical rings with gradient glow
  const ringCount = config.orbitRings;
  for (let i = 0; i < ringCount; i++) {
    const baseRadius = 3.5;
    const scale = 1 + i * 0.18;
    const ringGeo = new THREE.TorusGeometry(baseRadius * scale, 0.018, 16, 200);
    const hueShift = i * 0.08;
    const ringMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(c.accent) },
        uSecondary: { value: new THREE.Color(c.secondary) },
        uOpacity: { value: 0.35 - i * 0.07 },
        uTime: { value: 0 },
        uIndex: { value: i },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uSecondary;
        uniform float uOpacity;
        uniform float uTime;
        uniform float uIndex;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float ringMask = 1.0 - smoothstep(0.95, 1.0, length(vUv - 0.5) * 2.0);
          float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
          float pulse = sin(uTime * 1.5 + uIndex * 2.0 + angle * 3.0) * 0.5 + 0.5;
          vec3 color = mix(uSecondary, uColor, pulse * 0.5 + 0.5);
          float fresnel = pow(1.0 - abs(vNormal.z), 2.0);
          float alpha = uOpacity * ringMask * (0.6 + fresnel * 0.8);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(3.5, 0.02, 16, 200),
      ringMat
    );
    torus.rotation.x = Math.PI / 2.8;
    torus.rotation.y = (i * 0.35) + 0.4;
    torus.scale.set(1.0 + i * 0.15, 1.0 + i * 0.1, 0.4 + i * 0.1);
    torus.userData = { 
      baseRotationX: torus.rotation.x,
      baseRotationY: torus.rotation.y,
      speed: 0.08 + i * 0.025,
      tiltSpeed: 0.008 + i * 0.004,
    };
    orbitGroup.add(torus);
  }
  
  // Orbit particle field (particles along the orbital paths)
  const orbitParticleCount = config.orbitParticles;
  const orbitGeo = new THREE.BufferGeometry();
  const orbitPos = new Float32Array(orbitParticleCount * 3);
  const orbitSizes = new Float32Array(orbitParticleCount);
  const orbitColors = new Float32Array(orbitParticleCount * 3);
  const orbitSpeeds = new Float32Array(orbitParticleCount);
  const orbitAngles = new Float32Array(orbitParticleCount);
  const orbitRadii = new Float32Array(orbitParticleCount);
  const orbitTilts = new Float32Array(orbitParticleCount);
  const orbitPhases = new Float32Array(orbitParticleCount);
  
  for (let i = 0; i < orbitParticleCount; i++) {
    const ringIdx = Math.floor(Math.random() * config.orbitRings);
    const baseR = 3.5 + ringIdx * 0.45;
    const r = baseR + (Math.random() - 0.5) * 0.15;
    const angle = Math.random() * Math.PI * 2;
    const tilt = (Math.random() - 0.5) * 0.4;
    const phase = Math.random() * Math.PI * 2;
    const speed = 0.05 + Math.random() * 0.08;
    
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle) * Math.cos(tilt);
    const z = r * Math.sin(angle) * Math.sin(tilt) * 0.5;
    
    orbitPos[i * 3] = x;
    orbitPos[i * 3 + 1] = y;
    orbitPos[i * 3 + 2] = z;
    orbitSizes[i] = 0.015 + Math.random() * 0.025;
    orbitSpeeds[i] = speed;
    orbitAngles[i] = angle;
    orbitRadii[i] = r;
    orbitTilts[i] = tilt;
    orbitPhases[i] = phase;
    
    const t = Math.random();
    const clr = new THREE.Color();
    clr.setHSL(0.25 + t * 0.08, 0.95, 0.35 + t * 0.45);
    orbitColors[i * 3] = clr.r;
    orbitColors[i * 3 + 1] = clr.g;
    orbitColors[i * 3 + 2] = clr.b;
  }
  
  const orbitParticleGeo = new THREE.BufferGeometry();
  orbitParticleGeo.setAttribute('position', new THREE.BufferAttribute(orbitPos, 3));
  orbitParticleGeo.setAttribute('size', new THREE.BufferAttribute(orbitSizes, 1));
  orbitParticleGeo.setAttribute('color', new THREE.BufferAttribute(orbitColors, 3));
  
  const orbitParticleMat = new THREE.PointsMaterial({
    size: 0.04,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  
  const orbitParticles = new THREE.Points(orbitParticleGeo, orbitParticleMat);
  
  const orbitVisualGroup = new THREE.Group();
  orbitVisualGroup.add(orbitParticles);
  
  // Store references
  const orbitVisuals = {
    group: orbitVisualGroup,
    toruses: [],
    particles: orbitParticles,
    particlePositions: orbitPos,
    particleSpeeds: orbitSpeeds,
    particleAngles: orbitAngles,
    particleRadii: orbitRadii,
    particleTilts: orbitTilts,
    particlePhases: orbitPhases,
    particleCount: orbitParticleCount,
  };
  
  // We need to collect toruses - they're added dynamically
  return orbitVisuals;
}

/* ---------------------------------------------------------------------- */
/* Crystal Logo (fallback if Earth fails)                                  */
/* ---------------------------------------------------------------------- */
function createCrystalLogo() {
  const group = new THREE.Group();
  
  const baseGeo = new THREE.IcosahedronGeometry(1.2, 2);
  const positions = baseGeo.attributes.position.array;
  const newPositions = new Float32Array(positions.length);
  
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    const len = Math.sqrt(x * x + y * y + z * z);
    const noise = 1 + (Math.random() - 0.5) * 0.15;
    newPositions[i] = x / len * 1.2 * noise;
    newPositions[i + 1] = y / len * 1.2 * noise;
    newPositions[i + 2] = z / len * 1.2 * noise;
  }
  
  const crystalGeo = new THREE.BufferGeometry();
  crystalGeo.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
  crystalGeo.computeVertexNormals();
  
  const theme = document.documentElement.getAttribute('data-theme') || 'bosque';
  const themeColors = {
    bosque: { primary: 0x1E4D2B, secondary: 0x6BAA27, accent: 0xA9C73F },
    humedal: { primary: 0x114B44, secondary: 0x2E8B7C, accent: 0x8FD3C4 },
    desierto: { primary: 0x6B3F1D, secondary: 0xC97D3E, accent: 0xE8B771 },
    altiplano: { primary: 0x4A4A3A, secondary: 0x8C8C6D, accent: 0xC9C9A8 },
    sabana: { primary: 0x5A5A1E, secondary: 0xA6A63D, accent: 0xD9D97A },
  };
  const c = themeColors[document.documentElement.getAttribute('data-theme') || 'bosque'];
  
  const crystalMaterial = new THREE.MeshPhysicalMaterial({
    color: c.primary,
    metalness: 0,
    roughness: 0.05,
    transmission: 0.95,
    thickness: 0.5,
    ior: 1.52,
    envMapIntensity: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.01,
    sheen: 0.5,
    sheenColor: c.accent,
    iridescence: 0.3,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [100, 400],
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });
  
  const crystal = new THREE.Mesh(crystalGeo, crystalMaterial);
  crystal.castShadow = true;
  crystal.receiveShadow = true;
  
  const group = new THREE.Group();
  group.add(crystal);
  
  // Core glow
  const coreGeo = new THREE.SphereGeometry(0.4, 16, 16);
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: c.accent,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const core = new THREE.Mesh(coreGeo, coreMaterial);
  group.add(core);
  
  // Rings
  for (let i = 0; i < 3; i++) {
    const ringGeo = new THREE.RingGeometry(1.5 + i * 0.3, 1.6 + i * 0.3, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: c.secondary,
      transparent: true,
      opacity: 0.15 - i * 0.04,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = (Math.random() - 0.5) * 0.2;
    group.add(ring);
    ring.userData = { speed: 0.0005 + i * 0.0003 };
  }
  
  // Particles
  const particleCount = config.particles / 5;
  const particlesGeo = new THREE.BufferGeometry();
  const particlesPos = new Float32Array(particleCount * 3);
  const particlesSize = new Float32Array(particleCount);
  const particlesColor = new Float32Array(particleCount * 3);
  const particlesVelocity = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount; i++) {
    const radius = 1.5 + Math.random() * 2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    particlesPos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    particlesPos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    particlesPos[i * 3 + 2] = radius * Math.cos(phi);
    
    particlesSize[i] = 0.01 + Math.random() * 0.03;
    
    const color = new THREE.Color();
    color.setHSL(0.3 + Math.random() * 0.1, 0.8, 0.5 + Math.random() * 0.3);
    particlesColor[i * 3] = color.r;
    particlesColor[i * 3 + 1] = color.g;
    particlesColor[i * 3 + 2] = color.b;
    
    particlesVelocity[i * 3] = (Math.random() - 0.5) * 0.002;
    particlesVelocity[i * 3 + 1] = (Math.random() - 0.5) * 0.002;
    particlesVelocity[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
  }
  
  particlesGeo.setAttribute('position', new THREE.BufferAttribute(particlesPos, 3));
  particlesGeo.setAttribute('size', new THREE.BufferAttribute(particlesSize, 1));
  particlesGeo.setAttribute('color', new THREE.BufferAttribute(particlesColor, 3));
  particlesGeo.setAttribute('velocity', new THREE.BufferAttribute(particlesVelocity, 3));
  
  const particlesMaterial = new THREE.PointsMaterial({
    size: 0.02,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  
  const particles = new THREE.Points(particlesGeo, particlesMaterial);
  
  const group = new THREE.Group();
  group.add(crystal);
  group.add(core);
  group.add(particles);
  group.userData.particles = particles;
  group.userData.core = core;
  group.userData.rings = group.children.filter(c => c.geometry && c.geometry.type === 'RingGeometry');
  
  return group;
}

/* ---------------------------------------------------------------------- */
/* Terrain Morph (Biome Transition)                                        */
/* ---------------------------------------------------------------------- */
function createTerrainMorph() {
  const resolution = config.terrainResolution;
  const geometry = new THREE.PlaneGeometry(20, 20, resolution, resolution);
  
  const positions = geometry.attributes.position.array;
  const biomes = ['bosque', 'humedal', 'desierto', 'altiplano', 'sabana'];
  const biomeHeights = {
    bosque: { base: 0.3, noise: 0.5, freq: 0.8 },
    humedal: { base: 0.1, noise: 0.3, freq: 1.2 },
    desierto: { base: 0.05, noise: 0.4, freq: 0.6 },
    altiplano: { base: 0.6, noise: 0.8, freq: 0.5 },
    sabana: { base: 0.15, noise: 0.35, freq: 0.9 },
  };
  
  biomes.forEach((biome, idx) => {
    const morphArray = new Float32Array(positions.length);
    const params = biomeHeights[biome];
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      const noise = simplexNoise(x * params.freq, z * params.freq) * params.noise;
      morphArray[i + 1] = params.base + noise;
    }
    geometry.setAttribute(`morphTarget${idx}`, new THREE.BufferAttribute(morphArray, 3));
  });
  geometry.morphAttributes.position = biomes.map((_, idx) => geometry.getAttribute(`morphTarget${idx}`));
  
  const theme = document.documentElement.getAttribute('data-theme') || 'bosque';
  const themeColors = {
    bosque: { primary: 0x1E4D2B }, humedal: { primary: 0x114B44 },
    desierto: { primary: 0x6B3F1D }, altiplano: { primary: 0x4A4A3A },
    sabana: { primary: 0x5A5A1E },
  };
  const c = themeColors[theme] || themeColors.bosque;
  
  const terrainMaterial = new THREE.MeshPhysicalMaterial({
    color: c.primary,
    metalness: 0,
    roughness: 0.8,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4,
    envMapIntensity: 0.5,
    side: THREE.DoubleSide,
  });
  
  const terrain = new THREE.Mesh(geometry, terrainMaterial);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -1.5;
  terrain.receiveShadow = true;
  terrain.userData.morphTargets = biomes;
  terrain.userData.currentBiome = 0;
  terrain.userData.targetBiome = 0;
  terrain.userData.morphProgress = 0;
  
  return terrain;
}

function simplexNoise(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

/* ---------------------------------------------------------------------- */
/* Caustics Light Projection                                               */
/* ---------------------------------------------------------------------- */
function createCaustics() {
  if (!config.caustics) return null;
  
  const causticsMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0.3 },
      uColor: { value: new THREE.Color(getCausticColor()) },
      uScale: { value: 2.0 },
      uSpeed: { value: 0.15 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uIntensity;
      uniform vec3 uColor;
      uniform float uScale;
      uniform float uSpeed;
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      
      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 5; i++) {
          value += amplitude * noise(p);
          p *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }
      
      void main() {
        vec2 uv = vUv * uScale + uTime * uSpeed;
        float caustic = fbm(uv);
        caustic = smoothstep(0.4, 0.8, caustic);
        caustic = pow(caustic, 2.0);
        
        vec3 color = uColor * caustic * uIntensity;
        float alpha = caustic * uIntensity * 0.5;
        
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  
  const geometry = new THREE.PlaneGeometry(40, 40, 1, 1);
  const causticsMesh = new THREE.Mesh(geometry, causticsMaterial);
  causticsMesh.rotation.x = -Math.PI / 2;
  causticsMesh.position.y = -1.49;
  causticsMesh.visible = false;
  
  return causticsMesh;
}

function getCausticColor() {
  const theme = document.documentElement.getAttribute('data-theme') || 'bosque';
  const colors = {
    bosque: 0x6BAA27, humedal: 0x2E8B7C, desierto: 0xC97D3E,
    altiplano: 0x8C8C6D, sabana: 0xA6A63D,
  };
  return colors[theme] || colors.bosque;
}

/* ---------------------------------------------------------------------- */
/* Atmospheric Particle System                                             */
/* ---------------------------------------------------------------------- */
function createParticleSystem() {
  const count = config.particles;
  const geometry = new THREE.BufferGeometry();
  
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const alphas = new Float32Array(count);
  const lifetimes = new Float32Array(count);
  
  const theme = document.documentElement.getAttribute('data-theme') || 'bosque';
  const themeColors = {
    bosque: { primary: 0x1E4D2B, secondary: 0x6BAA27, accent: 0xA9C73F },
    humedal: { primary: 0x114B44, secondary: 0x2E8B7C, accent: 0x8FD3C4 },
    desierto: { primary: 0x6B3F1D, secondary: 0xC97D3E, accent: 0xE8B771 },
    altiplano: { primary: 0x4A4A3A, secondary: 0x8C8C6D, accent: 0xC9C9A8 },
    sabana: { primary: 0x5A5A1E, secondary: 0xA6A63D, accent: 0xD9D97A },
  };
  const c = themeColors[theme] || themeColors.bosque;
  
  for (let i = 0; i < count; i++) {
    const radius = 5 + Math.random() * 10;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
    
    sizes[i] = 0.01 + Math.random() * 0.05;
    
    const colorChoice = Math.random();
    let color;
    if (colorChoice < 0.33) color = new THREE.Color(c.primary);
    else if (colorChoice < 0.66) color = new THREE.Color(c.secondary);
    else color = new THREE.Color(c.accent);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    
    velocities[i * 3] = (Math.random() - 0.5) * 0.001;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.001 + 0.0005;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.001;
    
    alphas[i] = 0.1 + Math.random() * 0.4;
    lifetimes[i] = Math.random() * 100;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
  geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
  geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
  
  const material = new THREE.PointsMaterial({
    size: 0.02,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  
  return new THREE.Points(geometry, material);
}

/* ---------------------------------------------------------------------- */
/* Stars Background                                                        */
/* ---------------------------------------------------------------------- */
function createStars() {
  const count = isMobile ? 300 : 800;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 80;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 40 - 5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 80 - 20;
    
    sizes[i] = isMobile ? 0.02 : 0.015;
    
    const brightness = 0.5 + Math.random() * 0.5;
    colors[i * 3] = brightness;
    colors[i * 3 + 1] = brightness;
    colors[i * 3 + 2] = brightness;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
  const material = new THREE.PointsMaterial({
    size: isMobile ? 0.02 : 0.015,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  
  return new THREE.Points(geometry, material);
}

/* ---------------------------------------------------------------------- */
/* Scene Setup                                                             */
/* ---------------------------------------------------------------------- */
async function setupScene(canvas) {
  scene = new THREE.Scene();
  
  const { w, h } = getViewportSize();
  camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 200);
  camera.position.set(0, 1.5, 8);
  camera.lookAt(0, 0, 0);
  
  renderer = new THREE.WebGLRenderer({ 
    canvas, 
    antialias: !isMobile && qualityTier !== 'low', 
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.shadowMap.enabled = qualityTier === 'high';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  
  // Post-processing
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  
  // Bloom
  if (config.bloomStrength > 0) {
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(w, h), 
      config.bloomStrength, 
      config.bloomRadius, 
      config.bloomThreshold
    );
    composer.addPass(bloom);
    composer.bloomPass = bloom;
  }
  
  // RGB Shift
  if (config.enableChromaticAberration) {
    const rgbShift = new ShaderPass(RGBShiftShader);
    rgbShift.uniforms['amount'].value = 0.0008;
    rgbShift.uniforms['angle'].value = 0;
    composer.addPass(rgbShift);
  }
  
  // Vignette
  if (config.enableVignette) {
    const vignette = new ShaderPass(VignetteShader);
    vignette.uniforms['offset'].value = 0.7;
    vignette.uniforms['darkness'].value = 1.2;
    composer.addPass(vignette);
  }
  
  // Film Grain
  if (config.enableFilmGrain) {
    const film = new FilmPass(0.015, 0.005, 648, false);
    composer.addPass(film);
  }
  
  // Environment
  const envMap = createProceduralEnvMap(config.envMapResolution);
  scene.environment = envMap;
  
  // Lighting
  const ambientLight = new THREE.AmbientLight(0x223322, 0.5);
  scene.add(ambientLight);
  
  const sunLight = new THREE.DirectionalLight(0xffffee, 2.5);
  sunLight.position.set(10, 20, 5);
  sunLight.castShadow = qualityTier === 'high';
  if (sunLight.castShadow) {
    sunLight.shadow.mapSize.width = config.shadowMapSize;
    sunLight.shadow.mapSize.height = config.shadowMapSize;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 50;
    sunLight.shadow.camera.left = -20;
    sunLight.shadow.camera.right = 20;
    sunLight.shadow.camera.top = 20;
    sunLight.shadow.camera.bottom = -20;
    sunLight.shadow.bias = -0.001;
  }
  scene.add(sunLight);
  
  const fillLight = new THREE.DirectionalLight(0x88aaff, 0.6);
  fillLight.position.set(-5, 10, -5);
  scene.add(fillLight);
  
  const rimLight = new THREE.DirectionalLight(0xffddaa, 0.4);
  rimLight.position.set(0, -5, -10);
  scene.add(rimLight);
  
  // Load models
  try {
    const [earthGroup, satelliteGroup] = await Promise.all([
      loadEarthModel(),
      loadSatelliteModel(),
    ]);
    
    earthGroup.position.set(0, 0.5, 0);
    scene.add(earthGroup);
    earthMesh = earthGroup;
    
    // Create orbit visuals
    const theme = document.documentElement.getAttribute('data-theme') || 'bosque';
    const themeColors = {
      bosque: { primary: 0x1E4D2B, secondary: 0x6BAA27, accent: 0xA9C73F },
      humedal: { primary: 0x114B44, secondary: 0x2E8B7C, accent: 0x8FD3C4 },
      desierto: { primary: 0x6B3F1D, secondary: 0xC97D3E, accent: 0xE8B771 },
      altiplano: { primary: 0x4A4A3A, secondary: 0x8C8C6D, accent: 0xC9C9A8 },
      sabana: { primary: 0x5A5A1E, secondary: 0xA6A63D, accent: 0xD9D97A },
    };
    const c = themeColors[theme] || themeColors.bosque;
    
    const orbitVisuals = createOrbitVisuals(c);
    earthGroup.add(orbitVisuals.group);
    earthMesh.userData.orbitVisuals = orbitVisuals;
    
    // Add satellite to orbit
    satelliteGroup.position.set(3.5, 0, 0);
    satelliteMesh = satelliteGroup;
    orbitVisuals.group.add(satelliteGroup);
    earthMesh.userData.satellite = satelliteGroup;
    
  } catch (err) {
    console.warn('[Hero3D] Model loading failed, using fallback crystal:', err);
    
    // Fallback to crystal logo
    crystalLogo = createCrystalLogo();
    crystalLogo.position.set(0, 0.5, 0);
    scene.add(crystalLogo);
  }
  
  // Create other scene objects
  terrainMesh = createTerrainMorph();
  scene.add(terrainMesh);
  
  causticsMesh = createCaustics();
  if (causticsMesh) scene.add(causticsMesh);
  
  particleSystem = createParticleSystem();
  scene.add(particleSystem);
  
  const stars = createStars();
  scene.add(stars);
  scene.userData.stars = stars;
  
  fitCamera();
}

/* ---------------------------------------------------------------------- */
/* Camera Fit                                                              */
/* ---------------------------------------------------------------------- */
function fitCamera() {
  const { w, h } = getViewportSize();
  camera.aspect = w / h;
  const vTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const hTan = vTan * camera.aspect;
  const halfW = 3.5;
  const halfH = 2.5;
  camera.position.z = Math.max(6, halfW / hTan + 0.5, halfH / vTan + 0.5);
  camera.updateProjectionMatrix();
}

/* ---------------------------------------------------------------------- */
/* Animation                                                               */
/* ---------------------------------------------------------------------- */
let clock = new THREE.Clock();

function animate() {
  if (disposed) return;
  requestAnimationFrame(animate);
  if (paused) return;
  
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();
  
  // Earth animation
  if (earthMesh) {
    // Slow rotation
    earthMesh.rotation.y += 0.0005;
    earthMesh.rotation.x = Math.sin(elapsed * 0.2) * 0.03;
    
    // Mouse parallax
    targetRX += (mouseY * 0.08 - targetRX) * 0.02;
    targetRY += (mouseX * 0.08 - targetRY) * 0.02;
    earthMesh.rotation.x += (targetRX - earthMesh.rotation.x) * 0.03;
    earthMesh.rotation.y += (targetRY - earthMesh.rotation.y) * 0.03;
    
    // Core pulse
    if (earthMesh.userData.core) {
      const scale = 1 + Math.sin(elapsed * 1.5) * 0.08;
      earthMesh.userData.core.scale.setScalar(scale);
      earthMesh.userData.core.material.opacity = 0.15 + Math.sin(elapsed * 1.5) * 0.1;
    }
    
    // Atmosphere pulse
    if (earthMesh.userData.atmosphere) {
      const scale = 1 + Math.sin(elapsed * 0.8) * 0.03;
      earthMesh.userData.atmosphere.scale.setScalar(scale);
      earthMesh.userData.atmosphere.material.opacity = 0.08 + Math.sin(elapsed * 0.8) * 0.04;
    }
    
    // Satellite orbit
    if (earthMesh.userData.satellite && earthMesh.userData.orbitVisuals) {
      const ov = earthMesh.userData.orbitVisuals;
      const sat = earthMesh.userData.satellite;
      
      // Update satellite orbit
      ov.angle = (ov.angle || 0) + (ov.speed || 0.35) * delta;
      const angle = ov.angle;
      const radius = 3.5;
      const tilt = Math.PI / 5;
      
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle) * 0.3;
      const z = radius * Math.sin(angle) * 0.5;
      
      const cosT = Math.cos(Math.PI / 5);
      const sinT = Math.sin(Math.PI / 5);
      sat.position.set(
        x * cosT - z * sinT,
        y,
        x * sinT + z * cosT
      );
      
      // Satellite self rotation
      sat.rotation.y += 0.015;
      sat.rotation.x += 0.008;
      
      // Engine glow pulse
      if (sat.userData.engineGlow) {
        sat.userData.engineGlow.material.opacity = 0.6 + Math.sin(elapsed * 4) * 0.2;
        sat.userData.engineGlow.scale.setScalar(1 + Math.sin(elapsed * 4) * 0.15);
      }
      
      // Update orbit visuals
      if (ov.group) {
        // Animate torus rings
        ov.group.children.forEach((child, i) => {
          if (child.geometry && child.geometry.type === 'TorusGeometry') {
            child.rotation.z += (0.08 + i * 0.025) * delta;
            child.rotation.y += (0.008 + i * 0.004) * delta;
            child.material.uniforms.uTime.value = elapsed;
          }
        });
        
        // Update orbit particles
        if (ov.particles) {
          const tpos = ov.particlePositions;
          const tspeeds = ov.particleSpeeds;
          const tcount = ov.particleCount;
          
          for (let i = 0; i < tcount; i++) {
            ov.particleAngles[i] += ov.particleSpeeds[i] * delta;
            const a = ov.particleAngles[i];
            const r = ov.particleRadii[i];
            const tilt = ov.particleTilts[i];
            
            const x = r * Math.cos(ov.particleAngles[i]);
            const y = r * Math.sin(ov.particleAngles[i]) * Math.cos(ov.particleTilts[i]);
            const z = r * Math.sin(ov.particleAngles[i]) * Math.sin(ov.particleTilts[i]) * 0.5;
            
            ov.particlePositions[i * 3] = x;
            ov.particlePositions[i * 3 + 1] = y;
            ov.particlePositions[i * 3 + 2] = z;
          }
          ov.particles.geometry.attributes.position.needsUpdate = true;
        }
      }
    }
    
    // Terrain morph
    if (terrainMesh) {
      const targetProgress = terrainMesh.userData.targetBiome;
      terrainMesh.userData.morphProgress += (targetProgress - terrainMesh.userData.morphProgress) * 0.02;
      
      if (terrainMesh.morphTargetInfluences) {
        const biomes = terrainMesh.userData.morphTargets;
        const currentIdx = terrainMesh.userData.currentBiome;
        const nextIdx = Math.floor(terrainMesh.userData.morphProgress * (biomes.length - 1));
        const t = (terrainMesh.userData.morphProgress * (biomes.length - 1)) % 1;
        
        terrainMesh.morphTargetInfluences.forEach((_, i) => {
          if (i === currentIdx) terrainMesh.morphTargetInfluences[i] = 1 - t;
          else if (i === nextIdx) terrainMesh.morphTargetInfluences[i] = t;
          else terrainMesh.morphTargetInfluences[i] = 0;
        });
      }
      
      terrainMesh.rotation.z = Math.sin(elapsed * 0.1) * 0.01;
    }
    
    // Caustics
    if (causticsMesh && causticsMesh.material.uniforms) {
      causticsMesh.material.uniforms.uTime.value = elapsed;
      causticsMesh.material.uniforms.uIntensity.value = scrollProgress * 0.5;
      causticsMesh.visible = scrollProgress > 0.1;
    }
    
    // Particle system
    if (particleSystem) {
      particleSystem.rotation.y += 0.00005;
      const positions = particleSystem.geometry.attributes.position.array;
      const velocities = particleSystem.geometry.attributes.velocity.array;
      const lifetimes = particleSystem.geometry.attributes.lifetime.array;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];
        
        lifetimes[i / 3] += delta;
        
        if (positions[i + 1] > 10 || lifetimes[i / 3] > 200) {
          const radius = 5 + Math.random() * 10;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          
          positions[i] = radius * Math.sin(phi) * Math.cos(theta);
          positions[i + 1] = -10 + Math.random() * 5;
          positions[i + 2] = radius * Math.cos(phi);
          lifetimes[i / 3] = 0;
        }
      }
      particleSystem.geometry.attributes.position.needsUpdate = true;
      particleSystem.geometry.attributes.lifetime.needsUpdate = true;
    }
    
    // Stars
    if (scene.userData.stars) {
      scene.userData.stars.rotation.y += 0.00002;
    }
    
    // Orbit particles
    if (earthMesh && earthMesh.userData.orbitVisuals) {
      const ov = earthMesh.userData.orbitVisuals;
      if (ov.particles && ov.particlePositions) {
        const tpos = ov.particlePositions;
        const tspeeds = ov.particleSpeeds;
        const tcount = ov.particleCount;
        
        for (let i = 0; i < tcount; i++) {
          ov.particleAngles[i] += ov.particleSpeeds[i] * delta;
          const a = ov.particleAngles[i];
          const r = ov.particleRadii[i];
          const tilt = ov.particleTilts[i];
          
          const x = r * Math.cos(a);
          const y = r * Math.sin(a) * Math.cos(tilt);
          const z = r * Math.sin(a) * Math.sin(tilt) * 0.5;
          
          ov.particlePositions[i * 3] = x;
          ov.particlePositions[i * 3 + 1] = y;
          ov.particlePositions[i * 3 + 2] = z;
        }
        ov.particles.geometry.attributes.position.needsUpdate = true;
      }
      
      // Animate torus rings
      if (ov.group) {
        ov.group.children.forEach((child, i) => {
          if (child.geometry && child.geometry.type === 'TorusGeometry') {
            child.rotation.z += (0.08 + i * 0.025) * delta;
            child.rotation.y += (0.008 + i * 0.004) * delta;
            if (child.material.uniforms && child.material.uniforms.uTime) {
              child.material.uniforms.uTime.value = elapsed;
            }
          }
        });
      }
    }
    
    // Satellite engine glow
    if (earthMesh && earthMesh.userData.satellite) {
      const sat = earthMesh.userData.satellite;
      if (sat.userData.engineGlow) {
        sat.userData.engineGlow.material.opacity = 0.5 + Math.sin(elapsed * 4) * 0.3;
        sat.userData.engineGlow.scale.setScalar(1 + Math.sin(elapsed * 4) * 0.15);
      }
    }
  }
  
  composer.render();
  updateFPS();
}

/* ---------------------------------------------------------------------- */
/* Scroll Integration                                                      */
/* ---------------------------------------------------------------------- */
function onScroll(progress) {
  scrollProgress = THREE.MathUtils.clamp(progress, 0, 1);
  
  if (camera) {
    const targetZ = THREE.MathUtils.lerp(8, 3, scrollProgress);
    const targetY = THREE.MathUtils.lerp(1.5, 3, scrollProgress);
    camera.position.z += (targetZ - camera.position.z) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.lookAt(0, THREE.MathUtils.lerp(0, -1, scrollProgress), 0);
  }
  
  if (terrainMesh) {
    const biomesCount = terrainMesh.userData.morphTargets.length;
    terrainMesh.userData.targetBiome = scrollProgress * (biomesCount - 1) / (biomesCount - 1);
  }
  
  if (earthMesh) {
    const scale = THREE.MathUtils.lerp(1, 0.5, scrollProgress);
    earthMesh.scale.setScalar(scale);
    
    // Slow down orbit as we scroll
    if (earthMesh.userData.orbitVisuals) {
      earthMesh.userData.orbitVisuals.speed = THREE.MathUtils.lerp(0.35, 0.15, scrollProgress);
    }
  }
  
  if (crystalLogo) {
    const scale = THREE.MathUtils.lerp(1, 0.5, scrollProgress);
    crystalLogo.scale.setScalar(scale);
  }
  
  const heroContent = document.querySelector(HERO_CONTENT_SELECTOR);
  if (heroContent) {
    heroContent.style.opacity = 1 - scrollProgress * 0.8;
    heroContent.style.transform = `translateY(${scrollProgress * 50}px)`;
  }
}

/* ---------------------------------------------------------------------- */
/* Events                                                                  */
/* ---------------------------------------------------------------------- */
function onMouseMove(e) {
  if (isMobile) return;
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
}

function onResize() {
  if (!renderer || disposed) return;
  const { w, h } = getViewportSize();
  fitCamera();
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  if (composer.bloomPass) {
    composer.bloomPass.resolution.set(w, h);
  }
}

function updatePaused() {
  paused = document.hidden || !isHeroVisible();
}

function isHeroVisible() {
  const hero = document.querySelector('.hero');
  if (!hero) return true;
  const rect = hero.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

function initVisibilityPause() {
  document.addEventListener('visibilitychange', updatePaused);
  if ('IntersectionObserver' in window) {
    const hero = document.querySelector('.hero');
    if (hero) {
      const io = new IntersectionObserver((entries) => {
        updatePaused();
      }, { threshold: 0.01 });
      io.observe(hero);
    }
  }
}

/* ---------------------------------------------------------------------- */
/* Lifecycle                                                               */
/* ---------------------------------------------------------------------- */
function dispose() {
  disposed = true;
  paused = true;
  
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('resize', onResize);
  document.removeEventListener('visibilitychange', updatePaused);
  
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
  }
  
  const cleanup = (obj) => {
    if (!obj) return;
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
    if (obj.children) {
      obj.children.forEach(cleanup);
    }
  };
  
  cleanup(scene);
  
  if (composer) {
    composer.passes.forEach(pass => {
      if (pass.dispose) pass.dispose();
    });
  }
  
  scene = null;
  camera = null;
  renderer = null;
  composer = null;
  crystalLogo = null;
  terrainMesh = null;
  causticsMesh = null;
  particleSystem = null;
}

/* ---------------------------------------------------------------------- */
/* Public API                                                              */
/* ---------------------------------------------------------------------- */
export function initHero3D() {
  qualityTier = detectQualityTier();
  isMobile = isTouchDevice();
  
  const canvas = document.querySelector(CANVAS_SELECTOR);
  if (!canvas) {
    console.warn('Hero canvas not found');
    notifyReady();
    return;
  }
  
  setupScene(canvas);
  
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('resize', onResize);
  initVisibilityPause();
  
  animate();
  notifyReady();
}

export function setScrollProgress(progress) {
  onScroll(progress);
}

export function setBiome(biomeName) {
  if (!terrainMesh) return;
  const biomes = terrainMesh.userData.morphTargets;
  const idx = biomes.indexOf(biomeName);
  if (idx !== -1) {
    terrainMesh.userData.currentBiome = idx;
    terrainMesh.userData.targetBiome = idx / (biomes.length - 1);
  }
}

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getRenderer() { return renderer; }
export function isReady() { return !!scene && !disposed; }
export function pause() { paused = true; }
export function resume() { paused = false; }
export function destroy() { dispose(); }

// Expose for main.js
window.setScrollProgress = setScrollProgress;
window.setBiome = setBiome;
window.setQualityTier = setQualityTier;
window.getCurrentFPS = getCurrentFPS;

// Auto-init
if (document.readyState !== 'loading') {
  const canvas = document.querySelector(CANVAS_SELECTOR);
  if (canvas && !window.__hero3dPremiumInit) {
    window.__hero3dPremiumInit = true;
    initHero3D();
  }
} else {
  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector(CANVAS_SELECTOR);
    if (canvas && !window.__hero3dPremiumInit) {
      window.__hero3dPremiumInit = true;
      initHero3D();
    }
  });
}