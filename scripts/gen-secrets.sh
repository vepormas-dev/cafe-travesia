#!/usr/bin/env bash
# Genera los secretos propios del proyecto (no los de terceros como Wompi o Firebase).
set -euo pipefail

usage() {
  cat <<'EOF'
Uso: scripts/gen-secrets.sh [--format env|json|php] [--only NOMBRE]

Genera secretos aleatorios criptográficamente seguros (hex):
  DB_GATEWAY_SECRET  96 hex (48 bytes)  → Vercel + infra/cpanel/gateway/config.php ('secret')
  CRON_SECRET        64 hex (32 bytes)  → Vercel + cron de cPanel
  REVALIDATE_SECRET  64 hex (32 bytes)  → Vercel (reservada)

Opciones:
  --format env   KEY=VALUE (por defecto), listo para pegar en un .env
  --format json  objeto JSON
  --format php   línea 'secret' => '...' para config.php (solo DB_GATEWAY_SECRET)
  --only NOMBRE  genera solo esa variable
  -h, --help     esta ayuda

Ejemplos:
  scripts/gen-secrets.sh
  scripts/gen-secrets.sh --only CRON_SECRET
  scripts/gen-secrets.sh --format json > .work/secretos.json   # nunca lo subas a git

Los valores se imprimen en la salida estándar: guárdalos en el gestor de contraseñas del
cliente y pégalos en Vercel (Settings › Environment Variables, tipo "Sensitive"/Secret).
EOF
}

format="env"
only=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --format) format="${2:-}"; shift 2 ;;
    --format=*) format="${1#*=}"; shift ;;
    --only) only="${2:-}"; shift 2 ;;
    --only=*) only="${1#*=}"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Opción desconocida: $1" >&2; usage >&2; exit 2 ;;
  esac
done

rand_hex() {
  local bytes="$1"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$bytes"
  elif command -v php >/dev/null 2>&1; then
    php -r "echo bin2hex(random_bytes($bytes));"
  else
    od -An -tx1 -N"$bytes" /dev/urandom | tr -d ' \n'
  fi
}

declare -a names=(DB_GATEWAY_SECRET CRON_SECRET REVALIDATE_SECRET)
declare -A sizes=([DB_GATEWAY_SECRET]=48 [CRON_SECRET]=32 [REVALIDATE_SECRET]=32)

if [[ -n "$only" ]]; then
  if [[ -z "${sizes[$only]:-}" ]]; then
    echo "Variable desconocida: $only (válidas: ${names[*]})" >&2
    exit 2
  fi
  names=("$only")
fi

declare -A values=()
for n in "${names[@]}"; do values[$n]="$(rand_hex "${sizes[$n]}")"; done

case "$format" in
  env)
    echo "# Generado $(date -u +%Y-%m-%dT%H:%M:%SZ) con scripts/gen-secrets.sh — NO subir a git"
    for n in "${names[@]}"; do echo "$n=${values[$n]}"; done
    ;;
  json)
    out="{"
    sep=""
    for n in "${names[@]}"; do out+="${sep}\"$n\":\"${values[$n]}\""; sep=","; done
    echo "$out}"
    ;;
  php)
    if [[ -z "${values[DB_GATEWAY_SECRET]:-}" ]]; then
      echo "--format php solo aplica a DB_GATEWAY_SECRET" >&2
      exit 2
    fi
    echo "    'secret' => '${values[DB_GATEWAY_SECRET]}',"
    ;;
  *) echo "Formato inválido: $format" >&2; exit 2 ;;
esac
