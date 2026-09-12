#!/usr/bin/env node
/**
 * Auditoría estática del sitio y, opcionalmente, de dpzdata.com.
 *
 * Uso:
 *   node tools/seo-audit.mjs
 *   node tools/seo-audit.mjs --prod
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOMAIN = "https://dpzdata.com";
const STATIC_PAGES = ["index.html", "servicios.html", "nosotros.html", "blog.html", "contacto.html", "404.html"];
const blogDir = path.join(ROOT, "blog");
const errors = [];
const warnings = [];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const stripQuery = (value) => value.split("?")[0].split("#")[0];
const isExternal = (value) => /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(value);
const pageUrl = (file) => `${DOMAIN}/${file.replaceAll("\\", "/")}`.replace(`${DOMAIN}/index.html`, `${DOMAIN}/`);

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function matchOne(html, pattern) {
  return html.match(pattern)?.[1]?.trim() || "";
}

function allMatches(html, pattern) {
  return [...html.matchAll(pattern)].map((match) => match[1]);
}

async function checkPage(file, html) {
  const label = file.replaceAll("\\", "/");
  const canonical = matchOne(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i);
  const title = matchOne(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = matchOne(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i);
  const h1 = allMatches(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi).map((value) => value.replace(/<[^>]+>/g, "").trim()).filter(Boolean);
  const jsonLd = allMatches(html, /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

  if (!/<html[^>]+lang=["']es(?:-[A-Z]{2})?["']/i.test(html)) errors.push(`${label}: falta lang=es/es-CL.`);
  if (!title || title.length < 20) errors.push(`${label}: title ausente o demasiado corto.`);
  if (!description || description.length < 80) errors.push(`${label}: meta description ausente o demasiado corta.`);
  if (label !== "404.html" && (!canonical || canonical !== pageUrl(label))) errors.push(`${label}: canonical inesperada (${canonical || "ausente"}).`);
  if (!/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*index[^"']*follow/i.test(html) && label !== "404.html") {
    errors.push(`${label}: falta robots index,follow.`);
  }
  if (label !== "404.html" && h1.length !== 1) errors.push(`${label}: se espera exactamente un H1 con texto (hay ${h1.length}).`);
  if (!/<body(?![^>]*visibility\s*:\s*hidden)[^>]*>/i.test(html)) errors.push(`${label}: body oculto; una falla de JavaScript dejaría la página en blanco.`);
  if (!jsonLd.length && label !== "404.html") warnings.push(`${label}: no contiene JSON-LD.`);
  for (const block of jsonLd) {
    try {
      JSON.parse(block);
    } catch (error) {
      errors.push(`${label}: JSON-LD inválido (${error.message}).`);
    }
  }

  for (const raw of [
    ...allMatches(html, /\b(?:href|src|poster)=["']([^"']+)["']/gi),
    ...allMatches(html, /<source[^>]+src=["']([^"']+)["']/gi),
  ]) {
    const value = stripQuery(raw.trim());
    if (!value || value === "#" || isExternal(value) || value.startsWith("/")) continue;
    const target = path.resolve(path.dirname(path.join(ROOT, label)), value);
    if (!target.startsWith(ROOT) || !(await exists(target))) errors.push(`${label}: recurso local inexistente: ${raw}`);
  }
}

async function checkSitemap(files) {
  const file = path.join(ROOT, "sitemap.xml");
  const sitemap = await fs.readFile(file, "utf8");
  if (!sitemap.includes("<urlset") || !sitemap.includes("https://dpzdata.com/")) errors.push("sitemap.xml: estructura o dominio inválido.");
  if (!sitemap.includes("<loc>https://dpzdata.com/</loc>")) errors.push("sitemap.xml: falta la URL principal.");
  for (const page of files.filter((candidate) => candidate !== "404.html")) {
    const expected = `<loc>${pageUrl(page)}</loc>`;
    if (!sitemap.includes(expected)) errors.push(`sitemap.xml: falta ${pageUrl(page)}.`);
  }
  const sitemapUrls = allMatches(sitemap, /<loc>([^<]+)<\/loc>/g);
  for (const url of sitemapUrls) {
    const local = url.replace(`${DOMAIN}/`, "") || "index.html";
    if (local !== "index.html" && !(await exists(path.join(ROOT, local)))) errors.push(`sitemap.xml: URL sin archivo local: ${url}.`);
  }
}

async function checkProduction(urls) {
  for (const url of urls) {
    try {
      const response = await fetch(url, { redirect: "follow" });
      const body = await response.text();
      if (!response.ok) {
        errors.push(`producción: ${response.status} ${url}`);
        continue;
      }
      if (/text\/html/i.test(response.headers.get("content-type") || "")) {
        const h1 = allMatches(body, /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi).map((value) => value.replace(/<[^>]+>/g, "").trim()).filter(Boolean);
        if (!/<body(?![^>]*visibility\s*:\s*hidden)[^>]*>/i.test(body)) errors.push(`producción: body oculto en ${url}.`);
        if (h1.length !== 1) errors.push(`producción: ${url} no entrega un H1 con texto estático.`);
      }
    } catch (error) {
      errors.push(`producción: no se pudo consultar ${url} (${error.message}).`);
    }
  }
}

async function main() {
  const blogFiles = (await fs.readdir(blogDir)).filter((file) => file.endsWith(".html")).map((file) => path.join("blog", file));
  const files = [...STATIC_PAGES, ...blogFiles];
  for (const required of ["robots.txt", "sitemap.xml", "site.webmanifest", "google4f471a0ec4087197.html"]) {
    if (!(await exists(path.join(ROOT, required)))) errors.push(`falta archivo técnico: ${required}`);
  }
  const robots = await fs.readFile(path.join(ROOT, "robots.txt"), "utf8");
  if (!/Sitemap:\s*https:\/\/dpzdata\.com\/sitemap\.xml/i.test(robots)) errors.push("robots.txt: falta la directiva Sitemap correcta.");
  for (const file of files) await checkPage(file, await fs.readFile(path.join(ROOT, file), "utf8"));
  await checkSitemap(files);
  if (process.argv.includes("--prod")) {
    const productionPages = files.filter((file) => file !== "404.html").map(pageUrl);
    await checkProduction([...productionPages, `${DOMAIN}/robots.txt`, `${DOMAIN}/sitemap.xml`]);
  }

  console.log(`SEO audit: ${files.length} páginas revisadas${process.argv.includes("--prod") ? " + producción" : ""}`);
  for (const warning of warnings) console.log(`AVISO: ${warning}`);
  for (const error of errors) console.log(`ERROR: ${error}`);
  if (errors.length) {
    console.log(`BLOQUEADO: ${errors.length} error(es), ${warnings.length} aviso(s).`);
    process.exitCode = 1;
  } else {
    console.log(`OK: sin errores bloqueantes (${warnings.length} aviso(s)).`);
  }
}

await main();
