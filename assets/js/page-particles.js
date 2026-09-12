/* ==========================================================================
   DPZ Consulting — Page hero particles
   Nube de puntos 2D ligera (canvas) para page-hero y cta-band.
   Sin dependencias. Respeta prefers-reduced-motion y pausa fuera de pantalla.
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initParticles(host) {
    var canvas = host.querySelector("canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.setAttribute("aria-hidden", "true");
      canvas.style.cssText =
        "position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;";
      host.appendChild(canvas);
    }

    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;
    var pts = [];
    var visible = true;
    var LINK_DIST = 130;

    function resize() {
      var r = host.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reduceMotion) draw();
    }

    function seed() {
      var target = Math.min(140, Math.round((W * H) / 9000));
      pts = [];
      for (var i = 0; i < target; i++) {
        pts.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.28,
          r: 1 + Math.random() * 2,
          a: 0.45 + Math.random() * 0.5,
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var i, j, p, q, dx, dy, d;
      ctx.lineWidth = 1;
      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        for (j = i + 1; j < pts.length; j++) {
          q = pts[j];
          dx = p.x - q.x; dy = p.y - q.y;
          d = dx * dx + dy * dy;
          if (d < LINK_DIST * LINK_DIST) {
            ctx.strokeStyle = "rgba(255,255,255," + (0.15 * (1 - Math.sqrt(d) / LINK_DIST)).toFixed(3) + ")";
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        ctx.fillStyle = "rgba(255,255,255," + Math.min(0.6, p.a * 0.8).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function step() {
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
      }
    }

    function loop() {
      if (!canvas.isConnected) return;
      requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      step();
      draw();
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
      }, { threshold: 0.01 }).observe(host);
    }

    window.addEventListener("resize", resize);
    resize();
    if (!reduceMotion) loop();
  }

  function init() {
    var hosts = document.querySelectorAll(".page-hero, .cta-band, #form-particles");
    for (var i = 0; i < hosts.length; i++) initParticles(hosts[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
