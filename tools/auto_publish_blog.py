#!/usr/bin/env python3
"""Genera y prepara un artículo del blog para publicación autónoma.

El workflow programado ejecuta este script cuatro veces por semana. El script
selecciona el siguiente tema de la cola, solicita un borrador estructurado,
inyecta los datos editoriales controlados por DPZ, ejecuta el pre-mortem, genera
el sitio estático y corre la auditoría SEO. Si algo falla, termina sin entregar
un artículo listo para despliegue.

Requiere:
    OPENAI_API_KEY   Clave de API disponible solo como secreto del runner.
    OPENAI_MODEL     Opcional; por defecto ``gpt-5-mini``.

Uso:
    python tools/auto_publish_blog.py --dry-run
    python tools/auto_publish_blog.py
    python tools/auto_publish_blog.py --force
"""
from __future__ import annotations

import argparse
import copy
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, date
from pathlib import Path
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

from blog_premortem import validate


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "tools" / "posts.json"
QUEUE_PATH = ROOT / "tools" / "blog_queue.json"
TIMEZONE = ZoneInfo("America/Santiago")
SCHEDULED_WEEKDAYS = {2, 3, 4, 5}  # martes a viernes, ISO weekday
API_URL = "https://api.openai.com/v1/responses"
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
INTERNAL_LINK_RE = re.compile(r"href\s*=\s*[\"']\.\./(?:servicios|contacto|blog)\.html(?:[?#][^\"']*)?[\"']", re.I)
OFFICIAL_SOURCE_DOMAINS = ("conaf.cl", "sea.gob.cl", "mma.gob.cl")


class AutomationError(RuntimeError):
    """Error que debe bloquear la publicación automática."""


def read_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise AutomationError(f"No se pudo leer {path}: {exc}") from exc


def write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def now_chile() -> datetime:
    return datetime.now(TIMEZONE)


def validate_queue(queue: dict, config: dict) -> None:
    entries = queue.get("posts")
    if not isinstance(entries, list) or not entries:
        raise AutomationError("blog_queue.json debe contener una cola no vacía.")

    categories = config.get("categories", {})
    seen_ids: set[str] = set()
    seen_slugs: set[str] = set()
    for index, entry in enumerate(entries, 1):
        label = entry.get("slug") or f"tema #{index}"
        for field in ("id", "slug", "topic", "category", "focus_keyword", "publish_after", "image", "image_alt", "service_link", "cta_title", "cta_text", "sources"):
            if not entry.get(field):
                raise AutomationError(f"{label}: falta el campo de cola '{field}'.")
        if entry["id"] in seen_ids:
            raise AutomationError(f"{label}: id duplicado en la cola.")
        if entry["slug"] in seen_slugs or not SLUG_RE.fullmatch(entry["slug"]):
            raise AutomationError(f"{label}: slug duplicado o inválido en la cola.")
        seen_ids.add(entry["id"])
        seen_slugs.add(entry["slug"])
        if entry["category"] not in categories:
            raise AutomationError(f"{label}: categoría inexistente '{entry['category']}'.")
        try:
            date.fromisoformat(entry["publish_after"])
        except ValueError as exc:
            raise AutomationError(f"{label}: publish_after debe usar YYYY-MM-DD.") from exc
        image_path = ROOT / str(entry["image"]).lstrip("/")
        if not image_path.is_file():
            raise AutomationError(f"{label}: la imagen local no existe: {entry['image']}.")
        if not isinstance(entry["sources"], list) or not entry["sources"]:
            raise AutomationError(f"{label}: agrega al menos una fuente oficial.")
        for source in entry["sources"]:
            parsed = urlparse(str(source.get("url", "")))
            host = parsed.hostname or ""
            official_domain = any(host == domain or host.endswith(f".{domain}") for domain in OFFICIAL_SOURCE_DOMAINS)
            if parsed.scheme != "https" or not official_domain:
                raise AutomationError(f"{label}: fuente fuera de la allowlist oficial: {source.get('url')}")


def next_entry(queue: dict, config: dict, today: date) -> dict | None:
    published_slugs = {post.get("slug") for post in config.get("posts", [])}
    for entry in queue["posts"]:
        if entry.get("status", "queued") != "queued":
            continue
        if entry["slug"] in published_slugs:
            raise AutomationError(f"{entry['slug']}: ya existe en posts.json; resuelve el conflicto antes de continuar.")
        if date.fromisoformat(entry["publish_after"]) <= today:
            return entry
    return None


def source_context(entry: dict) -> str:
    return "\n".join(f"- {source['name']}: {source['url']}" for source in entry["sources"])


def response_schema() -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "title": {"type": "string"},
            "description": {"type": "string"},
            "excerpt": {"type": "string"},
            "lead": {"type": "string"},
            "read": {"type": "string"},
            "key_takeaways": {"type": "array", "items": {"type": "string"}},
            "sections": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "id": {"type": "string"},
                        "h2": {"type": "string"},
                        "html": {"type": "string"},
                        "key": {"type": "string"},
                    },
                    "required": ["id", "h2", "html", "key"],
                },
            },
            "faqs": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "question": {"type": "string"},
                        "answer": {"type": "string"},
                    },
                    "required": ["question", "answer"],
                },
            },
        },
        "required": ["title", "description", "excerpt", "lead", "read", "key_takeaways", "sections", "faqs"],
    }


def generate_draft(entry: dict) -> dict:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise AutomationError("Falta OPENAI_API_KEY; no se publica ningún artículo sin una clave configurada como secreto.")

    system_prompt = """Eres el editor técnico de DPZ Consulting, consultora chilena de diagnóstico ambiental, gestión forestal, SIG y planificación territorial.
Redacta en español de Chile para una persona que necesita tomar una decisión sobre un proyecto real.
Prioriza intención de búsqueda, utilidad, claridad, autoridad temática y precisión. No prometas aprobación,
cumplimiento ni primeros lugares. No inventes leyes, artículos, cifras, plazos, permisos, nombres de organismos
ni requisitos. Si una fuente no confirma un detalle, exprésalo como una recomendación para revisar el caso concreto.

Entrega exclusivamente el objeto JSON solicitado. En html usa solo p, ul, ol, li, strong, em, h3 y a.
No uses markdown, scripts, iframes, estilos, atributos on* ni HTML completo. Incluye enlaces contextuales
relativos a ../servicios.html o ../contacto.html. Usa la keyword principal de forma natural: en el título,
la introducción y al menos una sección; evita repetirla artificialmente. Redacta una respuesta completa,
con al menos 4 secciones sustantivas y alrededor de 700–1.000 palabras en total."""
    user_prompt = f"""Tema editorial: {entry['topic']}
Keyword principal: {entry['focus_keyword']}
Keywords secundarias: {', '.join(entry.get('secondary_keywords', []))}
Categoría: {entry['category']}
Audiencia: {entry.get('audience', 'titulares y equipos técnicos de proyectos en Chile')}

Fuentes oficiales autorizadas (úsalas como base y no agregues otras):
{source_context(entry)}

Escribe un título de 45–65 caracteres, una meta description de 120–165 caracteres,
un excerpt breve, un lead útil, 3–5 conclusiones, 4–6 secciones con H2 y 3 preguntas frecuentes.
Los H2 deben responder subtareas reales de la intención de búsqueda. Incluye al menos un enlace interno
contextual en el HTML de las secciones. No incluyas las fuentes en el JSON: el sistema las añadirá sin cambios."""

    payload = {
        "model": os.getenv("OPENAI_MODEL", "").strip() or "gpt-5-mini",
        "store": False,
        "tools": [{"type": "web_search"}],
        "input": [
            {"role": "system", "content": [{"type": "input_text", "text": system_prompt}]},
            {"role": "user", "content": [{"type": "input_text", "text": user_prompt}]},
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "dpz_blog_post",
                "strict": True,
                "schema": response_schema(),
            }
        },
    }
    request = urllib.request.Request(
        API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:800]
        raise AutomationError(f"La API de contenido respondió HTTP {exc.code}: {detail}") from exc
    except (urllib.error.URLError, json.JSONDecodeError) as exc:
        raise AutomationError(f"No se pudo obtener el borrador desde la API: {exc}") from exc

    output_text = data.get("output_text")
    if not output_text:
        chunks = []
        for item in data.get("output", []):
            for content in item.get("content", []):
                if content.get("type") in {"output_text", "text"} and content.get("text"):
                    chunks.append(content["text"])
        output_text = "".join(chunks)
    if not output_text:
        raise AutomationError("La API no devolvió contenido estructurado.")
    try:
        return json.loads(output_text)
    except json.JSONDecodeError as exc:
        raise AutomationError(f"La API devolvió un JSON inválido: {exc}") from exc


def build_post(entry: dict, draft: dict, published_on: date) -> dict:
    post = {
        "slug": entry["slug"],
        "title": draft["title"].strip(),
        "category": entry["category"],
        "focus_keyword": entry["focus_keyword"],
        "secondary_keywords": entry.get("secondary_keywords", []),
        "intent": "informacional",
        "date": published_on.isoformat(),
        "updated": published_on.isoformat(),
        "read": draft["read"].strip(),
        "excerpt": draft["excerpt"].strip(),
        "description": draft["description"].strip(),
        "image": entry["image"],
        "image_alt": entry["image_alt"],
        "service_link": entry["service_link"],
        "cta_title": entry["cta_title"],
        "cta_text": entry["cta_text"],
        "lead": draft["lead"].strip(),
        "key_takeaways": draft["key_takeaways"],
        "sections": draft["sections"],
        "faqs": draft["faqs"],
        "sources": copy.deepcopy(entry["sources"]),
    }
    return post



def ensure_internal_link(post: dict, entry: dict) -> None:
    """Añade un enlace interno estable si el borrador no lo incluyó."""
    body = " ".join(str(section.get("html", "")) for section in post["sections"])
    if INTERNAL_LINK_RE.search(body):
        return
    if not post["sections"]:
        raise AutomationError("El borrador necesita al menos una sección para insertar el enlace interno.")
    label = str(entry["service_link"]).strip()
    post["sections"][-1]["html"] = (
        str(post["sections"][-1].get("html", "")).rstrip()
        + f'<p>Si necesitas apoyo para este análisis, revisa nuestros <a href="../servicios.html">{label}</a>.</p>'
    )

def validate_generated(config: dict, post: dict) -> None:
    errors, warnings = validate({**config, "posts": [post]}, slug=post["slug"])
    if errors:
        details = "\n".join(f"- {error}" for error in errors)
        raise AutomationError(f"El borrador no supera el pre-mortem:\n{details}")
    body = " ".join(str(section.get("html", "")) for section in post["sections"])
    if not INTERNAL_LINK_RE.search(body):
        raise AutomationError("El borrador no contiene un enlace interno contextual a servicios, contacto o blog.")
    if len(post["sections"]) < 4:
        raise AutomationError("El borrador necesita al menos cuatro secciones sustantivas.")
    if len(post.get("key_takeaways", [])) < 3:
        raise AutomationError("El borrador necesita al menos tres conclusiones accionables.")
    if warnings:
        print("Avisos del pre-mortem:")
        for warning in warnings:
            print(f"  - {warning}")


def run_checked(command: list[str]) -> None:
    print("$ " + " ".join(command))
    subprocess.run(command, cwd=ROOT, check=True)


def publish(entry: dict, config: dict, queue: dict, today: date) -> None:
    print(f"Generando: {entry['slug']} ({entry['focus_keyword']})")
    draft = generate_draft(entry)
    post = build_post(entry, draft, today)
    ensure_internal_link(post, entry)
    validate_generated(config, post)

    original_config = CONFIG_PATH.read_text(encoding="utf-8")
    original_queue = QUEUE_PATH.read_text(encoding="utf-8")
    config["posts"].append(post)
    try:
        write_json(CONFIG_PATH, config)
        run_checked([sys.executable, "tools/generate_blog.py"])
        run_checked(["node", "tools/seo-audit.mjs"])
        entry["status"] = "published"
        entry["published_at"] = datetime.now(TIMEZONE).isoformat(timespec="seconds")
        write_json(QUEUE_PATH, queue)
    except Exception:
        CONFIG_PATH.write_text(original_config, encoding="utf-8")
        QUEUE_PATH.write_text(original_queue, encoding="utf-8")
        raise
    print(f"Artículo listo para commit y despliegue: blog/{post['slug']}.html")


def main() -> int:
    parser = argparse.ArgumentParser(description="Publica el siguiente artículo de la cola autónoma")
    parser.add_argument("--dry-run", action="store_true", help="muestra el siguiente tema sin llamar a la API")
    parser.add_argument("--force", action="store_true", help="permite ejecución manual fuera de martes-viernes")
    args = parser.parse_args()

    config = read_json(CONFIG_PATH)
    queue = read_json(QUEUE_PATH)
    validate_queue(queue, config)
    now = now_chile()
    if not args.force and now.isoweekday() not in SCHEDULED_WEEKDAYS:
        print(f"Sin publicación: hoy es {now.strftime('%A %Y-%m-%d')} en America/Santiago; los slots son martes-viernes.")
        return 0
    entry = next_entry(queue, config, now.date())
    if not entry:
        print("Sin publicación: la cola no tiene temas vencidos.")
        return 0
    print(f"Siguiente tema: {entry['slug']} — publicar después de {entry['publish_after']}.")
    if args.dry_run:
        return 0
    publish(entry, config, queue, now.date())
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AutomationError as exc:
        print(f"BLOQUEADO: {exc}", file=sys.stderr)
        raise SystemExit(1)
