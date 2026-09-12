# Publicación autónoma del blog

El proyecto incluye una cola editorial y el workflow `.github/workflows/blog-autopublish.yml`.
Está diseñado para publicar cuatro artículos por semana: martes, miércoles, jueves y viernes,
aproximadamente a las 08:15/09:15 de Chile según el horario vigente.

## Qué ocurre en cada ejecución

1. Selecciona el siguiente tema vencido en `tools/blog_queue.json`.
2. Solicita un borrador estructurado con fuentes oficiales y enlaces internos.
3. Ejecuta el pre-mortem editorial y técnico.
4. Regenera `blog/`, `blog.html` y `sitemap.xml`.
5. Ejecuta la auditoría SEO local.
6. Guarda los cambios en el repositorio y despliega en `https://dpzdata.com`.
7. Ejecuta la auditoría de producción.

Una falla en cualquier etapa detiene la ejecución y no despliega el resultado. El job queda visible
en GitHub Actions y GitHub puede notificar el fallo por correo a los colaboradores suscritos.

## Activación única

El proyecto actual no tiene un repositorio Git remoto configurado. Para activar el flujo:

1. Crea un repositorio privado para este proyecto y sube el contenido completo, incluyendo `.github/`.
2. En `Settings → Secrets and variables → Actions`, crea estos secretos:

   - `OPENAI_API_KEY`: clave de la API de generación.
   - `DPZ_SSH_PRIVATE_KEY`: clave privada SSH con acceso de despliegue al VPS.

3. Crea estas variables del repositorio:

   - `DPZ_SSH_HOST`: `142.44.213.117`.
   - `DPZ_SSH_USER`: `ubuntu`.
   - `OPENAI_MODEL`: opcional; si se omite, el script usa `gpt-5-mini`.

4. Habilita permiso de escritura para Actions sobre el contenido del repositorio.
5. Ejecuta primero `Run workflow` con `force` desactivado y revisa el resultado.

La clave SSH no debe subirse al repositorio ni quedar dentro del sitio público. El script usa salida
estructurada y el endpoint Responses con `store: false`; aun así, revisa la configuración de datos y
retención de tu cuenta antes de activar el proceso.

## Control editorial

La cola contiene temas y fuentes oficiales predefinidos. Para agregar un tema, incorpora un elemento
con el mismo esquema en `tools/blog_queue.json`. El estado cambia de `queued` a `published` cuando el
artículo supera todas las validaciones y se genera el despliegue.

El proceso no garantiza una posición concreta en Google. Mantiene una cadencia consistente y controla
los fundamentos técnicos, pero el posicionamiento depende también de calidad, competencia, autoridad,
experiencia y respuesta real de las personas usuarias.
