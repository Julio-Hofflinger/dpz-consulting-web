/* ==========================================================================
   DPZ Consulting — Hero 3D Lazy Loader
   Loads hero-3d-premium.js only when hero is near viewport
   Reduces initial bundle size for non-hero pages
   ========================================================================== */
(function () {
  "use strict";

  const CANVAS_SELECTOR = '#hero-canvas';
  const HERO_SELECTOR = '.hero, .page-hero';
  const LOAD_THRESHOLD = '200px'; // Start loading when within 200px of viewport
  const HERO3D_READY_EVENT = 'hero3d:ready';

  let loaded = false;
  let loading = false;

  // Check if hero canvas exists on this page
  const canvas = document.querySelector(CANVAS_SELECTOR);
  const hero = document.querySelector(HERO_SELECTOR);

  if (!canvas && !hero) {
    // No hero on this page, mark as ready immediately
    markReady();
    return;
  }

  // Use IntersectionObserver to lazy-load
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !loaded && !loading) {
          loadHero3D();
          observer.disconnect();
        }
      });
    }, { rootMargin: LOAD_THRESHOLD });

    const target = canvas || hero;
    if (target) observer.observe(target);
  } else {
    // Fallback: load after short delay
    setTimeout(loadHero3D, 100);
  }

  function loadHero3D() {
    if (loading || loaded) return;
    loading = true;

    // Preload Three.js module
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = 'https://cdn.jsdelivr.net/npm/three@0.164.0/build/three.module.js';
    document.head.appendChild(link);

    // Preload postprocessing modules
    const modules = [
      'https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/postprocessing/EffectComposer.js',
      'https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/postprocessing/RenderPass.js',
      'https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/postprocessing/UnrealBloomPass.js',
      'https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/postprocessing/ShaderPass.js',
      'https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/postprocessing/FilmPass.js',
      'https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/shaders/VignetteShader.js',
      'https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/shaders/ChromaticAberrationShader.js',
      'https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/shaders/RGBShiftShader.js',
    ];

    modules.forEach((href) => {
      const l = document.createElement('link');
      l.rel = 'modulepreload';
      l.href = href;
      document.head.appendChild(l);
    });

    // Load the actual module
    import('./hero-3d-premium.js?v=1')
      .then((module) => {
        loaded = true;
        console.log('[Hero3D] Loaded successfully');
      })
      .catch((err) => {
        console.error('[Hero3D] Failed to load:', err);
        markReady(); // Still mark ready to unblock page
      });
  }

  function markReady() {
    loaded = true;
    window.__hero3dReady = true;
    document.dispatchEvent(new CustomEvent(HERO3D_READY_EVENT));
    document.body.style.visibility = 'visible';
  }

  // Safety timeout: if not loaded in 5s, mark ready anyway
  setTimeout(() => {
    if (!loaded) markReady();
  }, 5000);

  // Expose for manual triggering
  window.__loadHero3D = loadHero3D;
})();