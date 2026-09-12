#!/usr/bin/env python3
"""
Generador de artículos del blog — DPZ Consulting
=================================================
Lee tools/posts.json y:
  1. Descarga la foto de cada post desde Unsplash y la convierte a WebP local
     (si aún no existe en assets/img/photos/).
  2. Genera cada artículo HTML en blog/<slug>.html con SEO + JSON-LD estilo Yoast.
  3. Reconstruye la grilla de tarjetas y los filtros de categoría en blog.html.
  4. Reconstruye la sección <!-- BLOG:URLS --> del sitemap.xml.

Uso:
    python tools/generate_blog.py            # genera todo
    python tools/generate_blog.py --slug X   # regenera solo un artículo

Para añadir un artículo nuevo: agrega un objeto al array "posts" de posts.json
y vuelve a ejecutar el script. Es idempotente (no duplica nada).
"""
import html
import json, os, re, io, sys, urllib.request

from blog_premortem import run_premortem

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = os.path.join(ROOT, "tools", "posts.json")
PHOTOS_DIR = os.path.join(ROOT, "assets", "img", "photos")
BLOG_DIR = os.path.join(ROOT, "blog")
UA = {"User-Agent": "Mozilla/5.0"}


def load():
    with open(CFG, encoding="utf-8") as f:
        return json.load(f)


def ensure_photo(photo, widths):
    """Descarga y convierte a WebP los anchos pedidos si faltan. Devuelve slug corto."""
    from PIL import Image
    os.makedirs(PHOTOS_DIR, exist_ok=True)
    short = photo.replace("photo-", "")[:16]
    missing = [w for w in widths if not os.path.exists(os.path.join(PHOTOS_DIR, "%s-%d.webp" % (short, w)))]
    if not missing:
        return short
    url = "https://images.unsplash.com/%s?auto=format&fit=crop&w=%d&q=80" % (photo, max(widths))
    req = urllib.request.Request(url, headers=UA)
    raw = urllib.request.urlopen(req, timeout=60).read()
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    for w in widths:
        h = int(im.size[1] * w / im.size[0])
        im.resize((w, h), Image.LANCZOS).save(
            os.path.join(PHOTOS_DIR, "%s-%d.webp" % (short, w)), "WEBP", quality=80, method=6)
        print("  + imagen %s-%d.webp" % (short, w))
    return short


def esc(s):
    return html.escape(str(s), quote=True)


def image_path(post, short, width, from_blog=False):
    """Devuelve una imagen existente, admitiendo assets locales o Unsplash."""
    prefix = "../" if from_blog else ""
    if post.get("image"):
        path = str(post["image"]).lstrip("/")
        if width == 1600 and path.endswith("-900.webp"):
            candidate = path[:-9] + "-1600.webp"
            if os.path.exists(os.path.join(ROOT, candidate)):
                path = candidate
        return prefix + path
    return prefix + "assets/img/photos/%s-%d.webp" % (short, width)


def head_nav(active):
    links = [("../index.html", "Inicio"), ("../servicios.html", "Servicios"),
             ("../nosotros.html", "Nosotros"), ("../blog.html", "Blog"),
             ("../contacto.html", "Contacto")]
    out = []
    for href, label in links:
        cur = ' aria-current="page"' if label == active else ""
        out.append('        <a class="nav__link" href="%s"%s>%s</a>' % (href, cur, label))
    return "\n".join(out)


def build_takeaways(post):
    items = post.get("key_takeaways") or []
    if not items:
        return ""
    bullets = "\n".join("            <li>%s</li>" % esc(item) for item in items)
    return (
        '          <div class="article__takeaways">\n'
        '            <h2>En resumen</h2>\n'
        '            <ul>\n%s\n            </ul>\n'
        '          </div>' % bullets
    )


def build_sources(post):
    sources = post.get("sources") or []
    if not sources:
        return ""
    links = "\n".join(
        '            <li><a href="%s" target="_blank" rel="noopener noreferrer">%s</a></li>'
        % (esc(source["url"]), esc(source["name"]))
        for source in sources
    )
    return (
        '          <section class="article__sources" aria-labelledby="fuentes-title">\n'
        '            <h2 id="fuentes-title">Fuentes y referencias</h2>\n'
        '            <p>Revisamos estas fuentes oficiales para preparar este contenido. La normativa puede actualizarse; verifica siempre el caso concreto antes de ejecutar un proyecto.</p>\n'
        '            <ul>\n%s\n            </ul>\n'
        '          </section>' % links
    )


def build_faq(post):
    faqs = post.get("faqs") or []
    if not faqs:
        return "", ""
    items = []
    for faq in faqs:
        question, answer = esc(faq["question"]), esc(faq["answer"])
        items.append('            <div class="article__faq-item"><h3>%s</h3><p>%s</p></div>' % (question, answer))
    faq_html = (
        '          <section class="article__faq" aria-labelledby="preguntas-title">\n'
        '            <h2 id="preguntas-title">Preguntas frecuentes</h2>\n%s\n'
        '          </section>' % "\n".join(items)
    )
    faq_schema = {
        "@type": "FAQPage",
        "@id": "%s#faq" % ("%s/blog/%s.html" % (post.get("_domain", "https://dpzdata.com"), post["slug"])),
        "mainEntity": [
            {"@type": "Question", "name": faq["question"], "acceptedAnswer": {"@type": "Answer", "text": faq["answer"]}}
            for faq in faqs
        ],
    }
    return faq_html, ",\n      " + json.dumps(faq_schema, ensure_ascii=False, indent=6)


def build_article(site, cats, post, short):
    d = site["domain"]
    slug = post["slug"]
    url = "%s/blog/%s.html" % (d, slug)
    cat = cats[post["category"]]
    hero1600 = image_path(post, short, 1600, from_blog=True)
    hero900 = image_path(post, short, 900, from_blog=True)
    post = dict(post, _domain=d)
    og_img = post.get("og_image")
    if not og_img:
        og_source = post.get("image") or "assets/img/photos/%s-900.webp" % short
        og_img = "%s/%s" % (d.rstrip("/"), str(og_source).lstrip("/"))

    # secciones + TOC
    toc, body = [], []
    for i, sec in enumerate(post["sections"], 1):
        toc.append('              <a href="#%s">%d. %s</a>' % (sec["id"], i, sec["h2"]))
        body.append('          <h2 id="%s">%d. %s</h2>' % (sec["id"], i, sec["h2"]))
        body.append("          " + sec["html"])
        if sec.get("key"):
            body.append(
                '          <div class="article__key"><h4><svg width="20" height="20" viewBox="0 0 24 24" fill="none">'
                '<path d="M12 2 4 6v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6l-8-4z" stroke="var(--dpz-secondary)" '
                'stroke-width="2" stroke-linejoin="round"/></svg> Punto clave</h4><p>%s</p></div>' % sec["key"])
    toc_html = "\n".join(toc)
    body_html = "\n".join(body)

    # relacionados: los otros posts (hasta 2)
    faq_html, faq_schema = build_faq(post)
    keywords = ", ".join([post.get("focus_keyword", "")] + post.get("secondary_keywords", []))
    return TEMPLATE.format(
        lang="es", title=esc(post["title"]), desc=esc(post["description"]),
        canon=url, author=site["author"], date=post["date"], og_img=og_img,
        cat=cat, cat_id=post["category"], slug=slug, domain=d,
        read=post["read"], date_h=fmt_date(post["date"]),
        hero1600=hero1600, hero900=hero900, image_alt=esc(post["image_alt"]),
        hero_srcset=("%s 900w, %s 1600w" % (hero900, hero1600)) if hero900 != hero1600 else hero1600,
        nav=head_nav("Blog"), lead=post["lead"], body=body_html, toc=toc_html,
        service_link=post["service_link"], cta_title=post["cta_title"], cta_text=post["cta_text"],
        author_role=site["author_role"], related=build_related(cats, post),
        updated=post.get("updated", post["date"]), keywords=esc(keywords),
        takeaways=build_takeaways(post), sources=build_sources(post), faq=faq_html, faq_schema=faq_schema)


MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
         "agosto", "septiembre", "octubre", "noviembre", "diciembre"]


def fmt_date(iso):
    y, m, day = iso.split("-")
    return "%d de %s de %s" % (int(day), MESES[int(m) - 1], y)


def build_related(cats, post, all_posts=None):
    rel = []
    for p in (all_posts or CURRENT_POSTS):
        if p["slug"] == post["slug"]:
            continue
        short = p.get("photo", "").replace("photo-", "")[:16]
        rel.append(
            '          <article class="blog-card" data-reveal-item>\n'
            '            <a href="%s.html" class="blog-card__media">\n'
            '              <span class="blog-card__cat">%s</span>\n'
            '              <img src="%s" alt="%s" loading="lazy" decoding="async">\n'
            '            </a>\n'
            '            <h3 class="blog-card__title"><a href="%s.html">%s</a></h3>\n'
            '          </article>' % (p["slug"], cats[p["category"]], image_path(p, short, 900, from_blog=True), esc(p["image_alt"]), p["slug"], esc(p["title"])))
        if len(rel) == 2:
            break
    return "\n".join(rel)


def build_card(site, cats, post, short):
    return (
        '          <article class="blog-card" data-cat="%s" data-reveal-item>\n'
            '            <a href="blog/%s.html" class="blog-card__media">\n'
            '              <span class="blog-card__cat">%s</span>\n'
            '              <img src="%s" alt="%s" loading="lazy" decoding="async">\n'
        '            </a>\n'
        '            <div class="blog-card__meta"><span>%s</span><span>&middot; %s</span></div>\n'
        '            <h2 class="blog-card__title"><a href="blog/%s.html">%s</a></h2>\n'
        '            <p>%s</p>\n'
        '            <div class="blog-card__foot">\n'
        '              <a class="link-arrow" href="blog/%s.html"><span>Leer art&iacute;culo</span>\n'
        '                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>\n'
        '              </a>\n'
        '            </div>\n'
        '          </article>' % (
            post["category"], post["slug"], cats[post["category"]], image_path(post, short, 900), esc(post["image_alt"]),
            fmt_date(post["date"]), post["read"], post["slug"], esc(post["title"]),
            esc(post["excerpt"]), post["slug"]))


def update_blog_index(site, cats, posts, shorts):
    path = os.path.join(ROOT, "blog.html")
    t = open(path, encoding="utf-8").read()
    # filtros: categorías presentes en los posts (en orden de aparición)
    used = []
    for p in posts:
        if p["category"] not in used:
            used.append(p["category"])
    filters = ['          <button class="blog-filter is-active" data-filter="all">Todos</button>']
    for c in used:
        filters.append('          <button class="blog-filter" data-filter="%s">%s</button>' % (c, cats[c]))
    filters_html = "\n".join(filters)
    cards_html = "\n".join(build_card(site, cats, p, shorts[p["slug"]]) for p in posts)

    t = re.sub(r'(<div class="blog-filters"[^>]*>).*?(</div>)',
               r'\1\n%s\n        \2' % filters_html, t, count=1, flags=re.S)
    t = re.sub(r'(<div class="blog-grid" data-reveal-group>).*?(\n\s*</div>\s*</div>\s*</section>)',
               lambda m: m.group(1) + "\n" + cards_html + m.group(2), t, count=1, flags=re.S)
    open(path, "w", encoding="utf-8").write(t)
    print("blog.html actualizado (%d tarjetas, %d filtros)" % (len(posts), len(used)))


def update_sitemap(site, posts):
    path = os.path.join(ROOT, "sitemap.xml")
    t = open(path, encoding="utf-8").read()
    urls = []
    for p in posts:
        urls.append("  <url>\n    <loc>%s/blog/%s.html</loc>\n    <lastmod>%s</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>"
                    % (site["domain"], p["slug"], p.get("updated", p["date"])))
    block = "\n".join(urls)
    if "<!-- BLOG:URLS -->" in t:
        t = re.sub(r'<!-- BLOG:URLS -->.*?<!-- /BLOG:URLS -->',
                   "<!-- BLOG:URLS -->\n%s\n  <!-- /BLOG:URLS -->" % block, t, flags=re.S)
    else:
        # insertar antes de </urlset>, quitando urls de blog antiguas
        t = re.sub(r'\s*<url>\s*<loc>[^<]*/blog/[^<]+</loc>.*?</url>', "", t, flags=re.S)
        t = t.replace("</urlset>", "  <!-- BLOG:URLS -->\n%s\n  <!-- /BLOG:URLS -->\n</urlset>" % block)
    open(path, "w", encoding="utf-8").write(t)
    print("sitemap.xml actualizado (%d URLs de blog)" % len(posts))


CURRENT_POSTS = []


def main():
    global CURRENT_POSTS
    cfg = load()
    site, cats, posts = cfg["site"], cfg["categories"], cfg["posts"]
    CURRENT_POSTS = posts
    only = None
    if "--slug" in sys.argv:
        only = sys.argv[sys.argv.index("--slug") + 1]
    run_premortem(cfg, slug=only)
    os.makedirs(BLOG_DIR, exist_ok=True)
    shorts = {}
    for p in posts:
        short = ""
        if not p.get("image"):
            short = ensure_photo(p["photo"], [900, 1600])
        shorts[p["slug"]] = short
        if only and p["slug"] != only:
            continue
        html = build_article(site, cats, p, short)
        with open(os.path.join(BLOG_DIR, p["slug"] + ".html"), "w", encoding="utf-8") as f:
            f.write(html)
        print("articulo -> blog/%s.html" % p["slug"])
    if not only:
        update_blog_index(site, cats, posts, shorts)
        update_sitemap(site, posts)
    print("Listo. %d articulos procesados." % (1 if only else len(posts)))


# ---------------------------------------------------------------------------
# Plantilla del artículo (se rellena con .format)
# ---------------------------------------------------------------------------
TEMPLATE = r'''<!DOCTYPE html>
<html lang="{lang}" class="no-js">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} &mdash; DPZ Consulting</title>
  <meta name="description" content="{desc}" />
  <meta name="theme-color" content="#1E4D2B" />
  <link rel="canonical" href="{canon}" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="author" content="{author}" />
  <meta name="article:published_time" content="{date}" />
  <meta name="article:modified_time" content="{updated}" />

  <meta property="og:locale" content="es_CL" />
  <meta property="og:site_name" content="DPZ Consulting" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{desc}" />
  <meta property="og:url" content="{canon}" />
  <meta property="og:image" content="{og_img}" />
  <meta property="og:image:alt" content="{image_alt}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{title}" />
  <meta name="twitter:description" content="{desc}" />
  <meta name="twitter:image" content="{og_img}" />

  <link rel="icon" href="../assets/img/favicon/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="32x32" href="../assets/img/favicon/favicon-32.png" />
  <link rel="apple-touch-icon" href="../assets/img/favicon/favicon-180.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="preload" as="image" href="{hero1600}" fetchpriority="high" />
  <link rel="stylesheet" href="../assets/css/style.css" />

  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@graph": [
      {{ "@type": "Organization", "@id": "{domain}/#organization", "name": "DPZ Consulting", "url": "{domain}/", "logo": {{ "@type": "ImageObject", "@id": "{domain}/#logo", "url": "{domain}/assets/img/favicon/favicon-512.png", "width": 512, "height": 512 }} }},
      {{ "@type": "WebSite", "@id": "{domain}/#website", "url": "{domain}/", "name": "DPZ Consulting", "publisher": {{ "@id": "{domain}/#organization" }}, "inLanguage": "es-CL" }},
      {{ "@type": "Person", "@id": "{domain}/#equipo", "name": "{author}" }},
      {{
        "@type": "Article",
        "@id": "{canon}#article",
        "isPartOf": {{ "@id": "{canon}#webpage" }},
        "author": {{ "@id": "{domain}/#equipo" }},
        "headline": "{title}",
        "datePublished": "{date}",
        "dateModified": "{updated}",
        "mainEntityOfPage": {{ "@id": "{canon}#webpage" }},
        "publisher": {{ "@id": "{domain}/#organization" }},
        "image": "{og_img}",
        "articleSection": "{cat}",
        "keywords": "{keywords}",
        "inLanguage": "es-CL"
      }},
      {{ "@type": "WebPage", "@id": "{canon}#webpage", "url": "{canon}", "name": "{title} — DPZ Consulting", "isPartOf": {{ "@id": "{domain}/#website" }}, "inLanguage": "es-CL", "breadcrumb": {{ "@id": "{canon}#breadcrumb" }} }},
      {{ "@type": "BreadcrumbList", "@id": "{canon}#breadcrumb", "itemListElement": [ {{ "@type": "ListItem", "position": 1, "name": "Inicio", "item": "{domain}/" }}, {{ "@type": "ListItem", "position": 2, "name": "Blog", "item": "{domain}/blog.html" }}, {{ "@type": "ListItem", "position": 3, "name": "{cat}" }} ] }}{faq_schema}
    ]
  }}
  </script>
</head>
<body>
  <a class="skip-link" href="#main">Saltar al contenido</a>

  <header class="header header--solid">
    <div class="header__inner">
      <a class="brand" href="../index.html" aria-label="DPZ Consulting — Inicio">
        <img class="brand__mark" src="../assets/img/logos/isologo-color.png" alt="Isotipo DPZ" width="46" height="46" decoding="async" />
        <span class="brand__text"><span class="brand__name">DPZ</span><span class="brand__sub">Consulting</span></span>
      </a>
      <nav class="nav" aria-label="Principal">
{nav}
      </nav>
      <div class="header__actions">
        <a class="btn header__cta" href="../contacto.html">Cotiza tu proyecto
          <svg class="btn__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
      </div>
      <button class="burger" aria-label="Abrir menú" aria-expanded="false" aria-controls="mobile-nav"><span></span><span></span><span></span></button>
    </div>
  </header>

  <nav class="mobile-nav" id="mobile-nav" aria-label="Menú móvil">
    <a href="../index.html">Inicio <span>01</span></a>
    <a href="../servicios.html">Servicios <span>02</span></a>
    <a href="../nosotros.html">Nosotros <span>03</span></a>
    <a href="../blog.html">Blog <span>04</span></a>
    <a href="../contacto.html">Contacto <span>05</span></a>
    <div class="mobile-nav__foot"><p>contacto@dpzdata.com</p><p>Diagnóstico · Planificación · Zonificación</p></div>
  </nav>

  <main id="main">
    <article class="article">
      <div class="wrap wrap--narrow">
        <div class="page-hero__crumbs" style="color:var(--dpz-gray);margin-bottom:1.5rem">
          <a href="../index.html" style="color:var(--dpz-secondary)">Inicio</a><span>/</span>
          <a href="../blog.html" style="color:var(--dpz-secondary)">Blog</a><span>/</span><span>{cat}</span>
        </div>
        <h1 style="font-size:clamp(2rem,5vw,3.4rem);max-width:20ch" data-hero-fade>{title}</h1>
        <div class="article__meta" data-hero-fade>
          <span class="cat">{cat}</span>
          <span>&middot; {date_h}</span>
          <span>&middot; {read} de lectura</span>
        </div>
      </div>

      <div class="wrap wrap--narrow">
        <figure class="article__hero-media" data-hero-fade>
          <img src="{hero1600}" srcset="{hero_srcset}" sizes="(max-width: 900px) 100vw, 900px" alt="{image_alt}" fetchpriority="high" decoding="async">
        </figure>
      </div>

      <div class="wrap article__layout">
        <div class="prose" data-reveal>
          <p>{lead}</p>
{takeaways}
{body}
          <p>En DPZ Consulting abordamos la <a href="../servicios.html">{service_link}</a> como un servicio acotado, con producto, plazo y alcance definidos.</p>
{sources}
{faq}

          <div class="author-row">
            <div class="author-row__avatar">DPZ</div>
            <div>
              <div class="author-row__name">{author}</div>
              <div class="author-row__role">{author_role}</div>
            </div>
          </div>
        </div>

        <aside class="article__aside">
          <div class="aside-box">
            <h4>En este artículo</h4>
            <nav class="aside-toc">
{toc}
            </nav>
          </div>
          <div class="aside-box aside-cta">
            <h4>{cta_title}</h4>
            <p>{cta_text}</p>
            <a class="btn btn--light" href="../contacto.html" style="width:100%;justify-content:center">Conversemos</a>
          </div>
          <div class="aside-box">
            <h4>Compartir</h4>
            <div class="share">
              <a href="https://www.linkedin.com/sharing/share-offsite/?url={canon}" aria-label="Compartir en LinkedIn" target="_blank" rel="noopener"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5A2.5 2.5 0 1 1 0 3.5a2.5 2.5 0 0 1 4.98 0zM.5 8h4V24h-4V8zM8 8h3.8v2.2h.05c.53-1 1.83-2.2 3.77-2.2 4.03 0 4.78 2.65 4.78 6.1V24h-4v-7.1c0-1.7-.03-3.9-2.37-3.9-2.37 0-2.73 1.85-2.73 3.77V24H8V8z"/></svg></a>
              <a href="mailto:?subject={title}&body={canon}" aria-label="Compartir por correo"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/><path d="m4 7 8 6 8-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></a>
            </div>
          </div>
        </aside>
      </div>
    </article>

    <section class="section related">
      <div class="wrap">
        <span class="eyebrow" data-reveal>Sigue leyendo</span>
        <h2 class="section-title" style="margin-bottom:clamp(2rem,4vw,3rem)" data-reveal="0.05">Artículos relacionados</h2>
        <div class="blog-grid" data-reveal-group>
{related}
        </div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="wrap">
      <div class="footer__top">
        <div>
          <div class="footer__brand"><img src="../assets/img/logos/isologo-white.png" alt="DPZ Consulting" width="52" decoding="async" /><b>DPZ Consulting</b></div>
          <p class="footer__desc">Diagnóstico, Planificación y Zonificación del Territorio. Consultora técnica ambiental, forestal y territorial en la Región Metropolitana y regiones aledañas.</p>
        </div>
        <div>
          <h4>Navegación</h4>
          <ul class="footer__links">
            <li><a href="../index.html">Inicio</a></li>
            <li><a href="../servicios.html">Servicios</a></li>
            <li><a href="../nosotros.html">Nosotros</a></li>
            <li><a href="../blog.html">Blog</a></li>
            <li><a href="../contacto.html">Contacto</a></li>
          </ul>
        </div>
        <div class="footer__contact">
          <h4>Contacto</h4>
          <p><a href="mailto:contacto@dpzdata.com">contacto@dpzdata.com</a></p>
          <p><a href="tel:+56962270739">+56 9 6227 0739</a></p>
          <p>Región Metropolitana, Chile</p>
        </div>
      </div>
      <div class="footer__bottom">
        <span>&copy; <span id="year"></span> DPZ Consulting. Todos los derechos reservados.</span>
        <div class="footer__social">
          <a href="#" aria-label="LinkedIn"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5A2.5 2.5 0 1 1 0 3.5a2.5 2.5 0 0 1 4.98 0zM.5 8h4V24h-4V8zM8 8h3.8v2.2h.05c.53-1 1.83-2.2 3.77-2.2 4.03 0 4.78 2.65 4.78 6.1V24h-4v-7.1c0-1.7-.03-3.9-2.37-3.9-2.37 0-2.73 1.85-2.73 3.77V24H8V8z"/></svg></a>
          <a href="#" aria-label="Instagram"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5.5" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/></svg></a>
        </div>
      </div>
    </div>
  </footer>

  <script src="https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
  <script src="../assets/js/main.js"></script>
  <script>document.getElementById("year").textContent = new Date().getFullYear();</script>
</body>
</html>
'''

if __name__ == "__main__":
    main()
