#!/usr/bin/env bash
# Respaldo diario de la BD de cPanel con rotación. Se copia al hosting (p. ej. ~/bin/) y se
# programa en cPanel › Advanced › Cron Jobs. Ver docs/deploy/01-cpanel-base-de-datos.md.
set -euo pipefail

usage() {
  cat <<'EOF'
Uso: backup-mysql.sh --db NOMBRE [--dir RUTA] [--keep-days N] [--defaults-file RUTA]

Crea RUTA/NOMBRE-AAAAMMDD-HHMM.sql.gz con mysqldump (transacción consistente, utf8mb4 y
triggers) y borra los respaldos con más de N días.

Opciones:
  --db NOMBRE            Base de datos (p. ej. usuario_cafetravesia)            [obligatorio]
  --dir RUTA             Carpeta destino FUERA de public_html (defecto: ~/backups/mysql)
  --keep-days N          Días a conservar (defecto: 14)
  --defaults-file RUTA   Archivo con credenciales [client] (defecto: ~/.my.cnf, permisos 600)
  -h, --help             Esta ayuda

Credenciales: crea ~/.my.cnf (chmod 600) con:
  [client]
  user=usuario_ctbackup
  password=CLAVE
  host=localhost

Cron de cPanel (diario 03:15 hora del servidor):
  15 3 * * * /bin/bash $HOME/bin/backup-mysql.sh --db usuario_cafetravesia >> $HOME/backups/mysql/backup.log 2>&1
EOF
}

db=""
dir="${HOME}/backups/mysql"
keep=14
defaults="${HOME}/.my.cnf"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --db) db="${2:-}"; shift 2 ;;
    --dir) dir="${2:-}"; shift 2 ;;
    --keep-days) keep="${2:-}"; shift 2 ;;
    --defaults-file) defaults="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Opción desconocida: $1" >&2; usage >&2; exit 2 ;;
  esac
done

[[ -n "$db" ]] || { echo "Falta --db" >&2; usage >&2; exit 2; }
[[ "$keep" =~ ^[0-9]+$ ]] || { echo "--keep-days debe ser un número" >&2; exit 2; }
[[ -f "$defaults" ]] || { echo "No existe $defaults (credenciales [client])" >&2; exit 2; }
command -v mysqldump >/dev/null 2>&1 || { echo "mysqldump no está disponible en este servidor" >&2; exit 3; }

umask 077
mkdir -p "$dir"
stamp="$(date +%Y%m%d-%H%M)"
out="${dir}/${db}-${stamp}.sql.gz"
tmp="${out}.part"

# --no-tablespaces: evita el error de privilegio PROCESS en MySQL ≥ 8.0.21 para usuarios de cPanel.
mysqldump --defaults-extra-file="$defaults" \
  --single-transaction --quick --triggers \
  --default-character-set=utf8mb4 --no-tablespaces --hex-blob \
  "$db" | gzip -9 > "$tmp"

# Verificación mínima: el gzip es válido y el volcado terminó
gzip -t "$tmp"
if ! gzip -dc "$tmp" | tail -n 3 | grep -q "Dump completed"; then
  echo "$(date -Is) ERROR: volcado incompleto de $db" >&2
  rm -f "$tmp"
  exit 4
fi
mv "$tmp" "$out"

find "$dir" -maxdepth 1 -type f -name "${db}-*.sql.gz" -mtime +"$keep" -print -delete
echo "$(date -Is) OK $out ($(du -h "$out" | cut -f1))"
