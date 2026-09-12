# Flujo editorial SEO de DPZ Consulting

Este flujo permite preparar y publicar artículos técnicos sin editar HTML a mano.
La fuente única es `tools/posts.json`; el generador crea las páginas, las tarjetas,
los enlaces relacionados y el sitemap.

## Pre-mortem antes de publicar

Imagina que el artículo ya se publicó y no recibe tráfico o genera una corrección.
Antes de generarlo, revisa:

1. **Intención:** define una pregunta concreta de una persona en Chile. Decide si es
   informacional o de investigación comercial. No mezcles varias intenciones en un
   solo artículo.
2. **Keyword principal:** escribe una frase específica en `focus_keyword`. Úsala de
   forma natural en el título, la descripción y la introducción. Añade variaciones en
   `secondary_keywords`; no repitas la frase de manera artificial.
3. **Respuesta útil:** el primer párrafo debe responder qué es o qué hacer. Luego
   desarrolla al menos tres H2 con pasos, criterios, límites y ejemplos aplicables.
4. **Confianza:** para normativa, permisos o datos técnicos incluye fuentes oficiales
   en `sources`. Diferencia una orientación general de una determinación legal para un
   caso concreto.
5. **Lectura y acceso:** usa párrafos breves, listas cuando ayuden, lenguaje claro,
   `image_alt` descriptivo y preguntas frecuentes que respondan dudas reales.
6. **Arquitectura:** enlaza servicios o artículos relacionados solo cuando aporte
   contexto. El generador añade breadcrumbs, CTA y dos relacionados.
7. **Riesgo de publicación:** confirma que el slug sea único, que la imagen exista,
   que la fecha sea correcta y que no haya datos de clientes, promesas de resultados
   ni afirmaciones normativas sin fuente.

## Comandos

```powershell
# Validar todo el inventario editorial
npm run blog:premortem

# Validar solo el borrador que estás preparando
python tools/blog_premortem.py --slug mi-nuevo-articulo

# Generar artículos, blog.html y sitemap.xml
npm run blog:generate

# Verificar HTML, metadatos, JSON-LD, recursos, enlaces y sitemap
npm run seo:audit

# Comprobar los endpoints públicos existentes
npm run seo:audit:prod
```

El generador se detiene si el pre-mortem encuentra errores bloqueantes. Los avisos
son señales para mejorar antes de publicar; `python tools/blog_premortem.py --strict`
los convierte en bloqueos.

## Criterio de posicionamiento

La estrategia prioriza autoridad temática local: diagnóstico territorial, cartografía
SIG, soporte regulatorio, bosque nativo, reforestación, arbolado urbano, humedales y
riesgo de incendios en Chile. Cada artículo debe resolver una necesidad concreta y
conectar con un servicio. Publicar muchas páginas casi iguales o repetir keywords
puede perjudicar la calidad y la confianza.

La estructura se basa en las recomendaciones de [Yoast sobre artículos SEO-friendly](https://yoast.com/seo-friendly-blog-post/)
y [estructura de sitio y enlaces internos](https://yoast.com/site-structure-the-ultimate-guide/):
intención de búsqueda, headings legibles, medios, metadatos, enlaces contextuales,
resúmenes y autoridad. El objetivo es mejorar la probabilidad de posicionar consultas
relevantes; no es posible garantizar el primer resultado orgánico.
