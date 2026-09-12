# ==========================================================================
# DPZ Consulting — Subir el sitio al servidor OVH (Fedora + Caddy) desde Windows
# Requiere: OpenSSH (incluido en Windows). Usa scp con tu clave SSH.
# Uso:  pwsh -File tools\deploy.ps1
# ==========================================================================

$ErrorActionPreference = "Stop"

# --- Configuración ---
$ServerIP   = "142.44.213.117"
$ServerUser = "ubuntu"
$SshKey     = "$env:USERPROFILE\.ssh\id_ed25519"   # tu clave existente
$WebRoot    = "/var/www/dpzdata"
$LocalRoot  = Split-Path -Parent $PSScriptRoot      # carpeta "WEB DPZ"

# Seguridad: el webroot debe ser una ruta fija y válida
if ([string]::IsNullOrWhiteSpace($WebRoot) -or $WebRoot -notmatch '^/var/www/[a-z0-9_-]+$') {
  throw "WebRoot inseguro o vacío: '$WebRoot'. Abortado."
}

# Archivos/carpetas que NO se suben a producción.
# Sin esta lista se publicaban 270 MB (node_modules, el GLB de 163 MB que
# ningún script carga, el zip del sitio y copias duplicadas de la home).
$Exclude = @(
  "Recursos DPZ Consulting", "tools", "docs", "README.md", ".git", ".gitignore",
  "node_modules", ".claude", "package.json", "package-lock.json",
  "dpz-web.zip", "index-remote.html", "null", "fix_hero.py",
  "deploy.sh", "parse-lighthouse.js", "prompts-imagenes.json",
  "AGENTS.md", "DEPLOY.md", "LIGHTHOUSE-CHECKLIST.md", "caddyfile.txt"
)
# Patrones (comodines) que tampoco se suben
$ExcludePattern = @("_remote_*", "lighthouse-report*", "*.bak", "*.log")

# Archivos sueltos dentro de subcarpetas que no van a producción
$ExcludePath = @("assets\models\earth_-_16k_high_resolution.glb")

Write-Host "==> Preparando archivos de producción..." -ForegroundColor Cyan
$Stage = Join-Path $env:TEMP "dpz-deploy"
if (Test-Path $Stage) { Remove-Item -Recurse -Force $Stage }
New-Item -ItemType Directory -Force -Path $Stage | Out-Null

Get-ChildItem -LiteralPath $LocalRoot -Force | Where-Object {
  $name = $_.Name
  ($Exclude -notcontains $name) -and
  -not ($ExcludePattern | Where-Object { $name -like $_ })
} | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $Stage -Recurse -Force
}

foreach ($rel in $ExcludePath) {
  $p = Join-Path $Stage $rel
  if (Test-Path $p) { Remove-Item -LiteralPath $p -Force; Write-Host "    excluido: $rel" -ForegroundColor DarkGray }
}

$stageMB = [math]::Round((Get-ChildItem $Stage -Recurse -File | Measure-Object Length -Sum).Sum / 1MB, 1)
Write-Host "    Archivos listos en staging: $stageMB MB" -ForegroundColor Green

# Subimos a una carpeta temporal del usuario y sincronizamos con rsync (borra solo dentro del webroot)
Write-Host "==> Subiendo a ${ServerUser}@${ServerIP} ..." -ForegroundColor Cyan
ssh -i "$SshKey" "${ServerUser}@${ServerIP}" "mkdir -p /tmp/dpz-upload && find /tmp/dpz-upload -mindepth 1 -delete"
scp -i "$SshKey" -r "$Stage\*" "${ServerUser}@${ServerIP}:/tmp/dpz-upload/"

Write-Host "==> Instalando en $WebRoot (con sudo)..." -ForegroundColor Cyan
# rsync con --delete SOLO afecta el contenido de $WebRoot (destino fijo y validado)
$remote = "sudo mkdir -p '$WebRoot' && sudo rsync -a --delete /tmp/dpz-upload/ '$WebRoot/' && " +
          "(sudo chown -R caddy:caddy '$WebRoot' 2>/dev/null || sudo chown -R root:root '$WebRoot'); " +
          "sudo chmod -R 755 '$WebRoot' && find /tmp/dpz-upload -mindepth 1 -delete && echo DEPLOY_OK"
ssh -i "$SshKey" "${ServerUser}@${ServerIP}" $remote

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " Subida completa a $WebRoot" -ForegroundColor Green
Write-Host " Cuando el DNS apunte aquí: https://dpzdata.com" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
