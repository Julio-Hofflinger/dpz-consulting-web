#!/usr/bin/env node
/** Health check rápido de la versión publicada. Para auditoría completa usa seo-audit.mjs. */
const urls = [
  "https://dpzdata.com/",
  "https://dpzdata.com/robots.txt",
  "https://dpzdata.com/sitemap.xml",
  "https://dpzdata.com/blog.html",
  "https://dpzdata.com/contacto.html",
];

const checks = [
  ["robots", "https://dpzdata.com/robots.txt", (body) => /Sitemap:\s*https:\/\/dpzdata\.com\/sitemap\.xml/i.test(body)],
  ["sitemap", "https://dpzdata.com/sitemap.xml", (body) => /<urlset[\s>]/i.test(body) && /https:\/\/dpzdata\.com\/blog\//i.test(body)],
  ["blog", "https://dpzdata.com/blog.html", (body) => /<h1\b[^>]*>[^<]+/i.test(body) && /blog\/[^"']+\.html/i.test(body)],
  ["contacto", "https://dpzdata.com/contacto.html", (body) => /formspree\.io/i.test(body) && /<form\b/i.test(body)],
];

(async () => {
  let failed = false;
  const bodies = new Map();
  for (const url of urls) {
    try {
      const response = await fetch(url, { redirect: "follow" });
      const body = await response.text();
      bodies.set(url, body);
      console.log(`${response.status} ${url}`);
      if (!response.ok) failed = true;
    } catch (error) {
      failed = true;
      console.error(`ERROR ${url}: ${error.message}`);
    }
  }
  for (const [name, url, predicate] of checks) {
    const body = bodies.get(url) || "";
    const ok = predicate(body);
    console.log(`${ok ? "OK" : "ERROR"} ${name}`);
    if (!ok) failed = true;
  }
  if (failed) process.exitCode = 1;
})();
