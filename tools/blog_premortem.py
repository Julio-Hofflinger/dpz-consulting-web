#!/usr/bin/env python3
"""Pre-mortem editorial y técnico para los artículos de DPZ Consulting.

Valida el archivo ``tools/posts.json`` antes de generar HTML. El objetivo es
detectar errores de publicación (slug duplicado, metadatos incompletos, enlaces
rotos, imágenes inexistentes y contenido demasiado corto) antes de que lleguen
al sitio.

Uso:
    python tools/blog_premortem.py
    python tools/blog_premortem.py --slug mi-articulo
    python tools/blog_premortem.py --strict
"""
from __future__ import annotations

import argparse
import html as html_lib
import json
import re
import sys
import unicodedata
from datetime import date, timedelta
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "tools" / "posts.json"
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
URL_RE = re.compile(r"^https://[^\s]+$")


class TextExtractor(HTMLParser):
    """Extrae texto visible de los fragmentos HTML del archivo editorial."""

    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self.hidden_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style"}:
            self.hidden_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style"} and self.hidden_depth:
            self.hidden_depth -= 1

    def handle_data(self, data: str) -> None:
        if not self.hidden_depth:
            self.parts.append(data)


def visible_text(value: str) -> str:
    parser = TextExtractor()
    parser.feed(value or "")
    return " ".join("".join(parser.parts).split())


def words(value: str) -> int:
    return len(re.findall(r"\b[\wÀ-ÿ]+\b", value or "", flags=re.UNICODE))


def normalized(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "")
    return "".join(c for c in value if not unicodedata.combining(c)).lower()


def load_config() -> dict:
    try:
        return json.loads(CONFIG.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"No se pudo leer {CONFIG}: {exc}") from exc


def local_image_exists(path_value: str) -> bool:
    path_value = path_value.lstrip("/")
    return (ROOT / path_value).is_file()


def add(errors: list[str], warnings: list[str], level: str, message: str) -> None:
    (errors if level == "error" else warnings).append(message)


def validate(config: dict, slug: str | None = None, strict: bool = False) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    site = config.get("site") or {}
    categories = config.get("categories") or {}
    posts = config.get("posts")

    if not isinstance(posts, list) or not posts:
        return ["posts.json debe contener un array 'posts' con al menos un artículo."], []
    if not str(site.get("domain", "")).startswith("https://"):
        add(errors, warnings, "error", "site.domain debe usar HTTPS.")

    selected = [p for p in posts if slug is None or p.get("slug") == slug]
    if slug and not selected:
        add(errors, warnings, "error", f"No existe un artículo con slug '{slug}'.")
    seen: set[str] = set()
    today = date.today()

    for index, post in enumerate(selected, 1):
        label = post.get("slug") or f"post #{index}"
        required = ["slug", "title", "category", "date", "excerpt", "description", "image_alt", "lead", "sections"]
        for key in required:
            if not post.get(key):
                add(errors, warnings, "error", f"{label}: falta el campo obligatorio '{key}'.")

        post_slug = str(post.get("slug", ""))
        if post_slug in seen:
            add(errors, warnings, "error", f"{label}: slug duplicado.")
        seen.add(post_slug)
        if post_slug and not SLUG_RE.fullmatch(post_slug):
            add(errors, warnings, "error", f"{label}: slug inválido; usa minúsculas, números y guiones.")
        if post.get("category") not in categories:
            add(errors, warnings, "error", f"{label}: categoría inexistente '{post.get('category')}'.")

        try:
            published = date.fromisoformat(str(post.get("date")))
            if published > today + timedelta(days=365):
                add(errors, warnings, "error", f"{label}: fecha demasiado futura ({published.isoformat()}).")
        except ValueError:
            add(errors, warnings, "error", f"{label}: date debe tener formato YYYY-MM-DD.")

        updated = post.get("updated", post.get("date"))
        try:
            if date.fromisoformat(str(updated)) < date.fromisoformat(str(post.get("date"))):
                add(errors, warnings, "error", f"{label}: updated no puede ser anterior a date.")
        except ValueError:
            add(errors, warnings, "error", f"{label}: updated debe tener formato YYYY-MM-DD.")

        title = str(post.get("title", ""))
        description = str(post.get("description", ""))
        if len(title) > 90:
            add(errors, warnings, "error", f"{label}: title supera 90 caracteres ({len(title)}).")
        elif not 45 <= len(title) <= 65:
            add(errors, warnings, "warning", f"{label}: title tiene {len(title)} caracteres; apunta a 45–65.")
        if len(description) < 80 or len(description) > 180:
            add(errors, warnings, "error", f"{label}: description debe quedar entre 80 y 180 caracteres ({len(description)}).")
        elif not 120 <= len(description) <= 165:
            add(errors, warnings, "warning", f"{label}: description tiene {len(description)} caracteres; apunta a 120–165.")

        focus = str(post.get("focus_keyword", "")).strip()
        if not focus:
            add(errors, warnings, "error", f"{label}: falta focus_keyword para controlar la intención de búsqueda.")
        else:
            corpus = normalized(" ".join([title, description, str(post.get("excerpt", "")), str(post.get("lead", ""))]))
            if normalized(focus) not in corpus:
                add(errors, warnings, "error", f"{label}: focus_keyword no aparece en title, description, excerpt o lead.")
            if not 2 <= len(focus.split()) <= 7:
                add(errors, warnings, "warning", f"{label}: focus_keyword debería tener 2–7 palabras.")

        image = post.get("image")
        if image and not local_image_exists(str(image)):
            add(errors, warnings, "error", f"{label}: la imagen local no existe: {image}.")
        if not image and not post.get("photo"):
            add(errors, warnings, "error", f"{label}: define image (local) o photo (Unsplash).")

        sections = post.get("sections")
        if not isinstance(sections, list) or len(sections) < 3:
            add(errors, warnings, "error", f"{label}: agrega al menos 3 secciones con H2.")
        else:
            ids: set[str] = set()
            body_parts = [str(post.get("lead", ""))]
            for sec in sections:
                sid = str(sec.get("id", ""))
                if not sid or sid in ids or not SLUG_RE.fullmatch(sid):
                    add(errors, warnings, "error", f"{label}: id de sección inválido o duplicado: '{sid}'.")
                ids.add(sid)
                if not sec.get("h2") or not sec.get("html"):
                    add(errors, warnings, "error", f"{label}: cada sección necesita h2 y html.")
                raw_html = str(sec.get("html", ""))
                if re.search(r"<\s*(script|iframe)|\son\w+\s*=", raw_html, re.I):
                    add(errors, warnings, "error", f"{label}: html contiene una etiqueta o atributo no permitido.")
                body_parts.extend([str(sec.get("h2", "")), visible_text(raw_html)])

            content_words = words(" ".join(body_parts))
            if content_words < 450:
                add(errors, warnings, "warning", f"{label}: contenido estimado de {content_words} palabras; completa la respuesta antes de publicar.")
            if not any("href=" in str(sec.get("html", "")) for sec in sections):
                add(errors, warnings, "warning", f"{label}: añade al menos un enlace contextual a otro recurso relevante.")

        for source in post.get("sources", []):
            if not isinstance(source, dict) or not source.get("name") or not URL_RE.fullmatch(str(source.get("url", ""))):
                add(errors, warnings, "error", f"{label}: cada source necesita name y una URL HTTPS válida.")
        if not post.get("sources"):
            add(errors, warnings, "warning", f"{label}: no tiene fuentes; incorpora fuentes oficiales cuando el tema sea normativo o técnico.")

        faqs = post.get("faqs", [])
        if len(faqs) > 5:
            add(errors, warnings, "error", f"{label}: máximo 5 preguntas frecuentes.")
        for faq in faqs:
            if not isinstance(faq, dict) or not faq.get("question") or not faq.get("answer"):
                add(errors, warnings, "error", f"{label}: cada FAQ necesita question y answer.")

    if strict and warnings:
        errors.extend(f"[strict] {warning}" for warning in warnings)
    return errors, warnings


def report(config: dict, slug: str | None = None, strict: bool = False) -> int:
    errors, warnings = validate(config, slug=slug, strict=strict)
    scope = f" ({slug})" if slug else ""
    print(f"Premortem blog{scope}")
    if errors:
        for error in errors:
            print(f"  ERROR: {error}")
    if warnings:
        for warning in warnings:
            print(f"  AVISO: {warning}")
    if errors:
        print(f"BLOQUEADO: {len(errors)} error(es), {len(warnings)} aviso(s).")
        return 1
    print(f"OK: sin errores bloqueantes ({len(warnings)} aviso(s)).")
    return 0


def run_premortem(config: dict, slug: str | None = None, strict: bool = False) -> None:
    errors, _ = validate(config, slug=slug, strict=strict)
    if errors:
        raise ValueError("Premortem bloqueado; ejecuta 'python tools/blog_premortem.py' para ver el detalle.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Valida posts.json antes de generar artículos")
    parser.add_argument("--slug", help="valida solo un artículo")
    parser.add_argument("--strict", action="store_true", help="convierte avisos en errores")
    args = parser.parse_args()
    try:
        return report(load_config(), slug=args.slug, strict=args.strict)
    except ValueError as exc:
        print(f"ERROR: {html_lib.escape(str(exc))}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
