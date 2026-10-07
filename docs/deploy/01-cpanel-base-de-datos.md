# 01 · Base de datos MySQL/MariaDB en cPanel

**Objetivo:** crear la BD `cpuser_cafetravesia` en `utf8mb4_unicode_ci`, con un usuario de aplicación de privilegios mínimos. Luego aplicar las migraciones y el contenido inicial, y dejar respaldos diarios con rotación de 14 días y una restauración probada.

**Prerrequisitos**

- Acceso a cPanel versión 120 o superior. En cPanel 118 o anterior las pantallas se llaman «MySQL® Databases» y «Remote MySQL®» ([docs cPanel](https://docs.cpanel.net/cpanel/databases/manage-my-databases/)).
- Para aplicar migraciones con la opción A: la pasarela ya instalada ([02](02-cpanel-pasarela-y-medios.md)) y, en tu equipo, Node 22 con `npm ci` hecho en la raíz del repo.
- Versión mínima de la BD: **MySQL 5.7.8** o **MariaDB 10.3**. El esquema usa `datetime(3)` con `DEFAULT CURRENT_TIMESTAMP(3)`, `longtext` para JSON, `enum` e índices `utf8mb4` sobre `varchar(191)`, y en estas versiones el formato de fila `DYNAMIC` (prefijos de índice largos) viene activo por defecto. La versión aparece en cPanel › *General Information › Server Information*, y también la reporta `gateway-smoke`.

> El cPanel antepone el usuario de la cuenta como prefijo: si la cuenta es `cpuser`, la BD queda `cpuser_cafetravesia` y el usuario `cpuser_ctapp`. Los nombres de usuario de BD tienen límite de longitud (MySQL 5.7+: 32 caracteres con el prefijo; [docs](https://docs.cpanel.net/cpanel/databases/mysql-databases/)).

## 1. Crear la base de datos

1. cPanel › **Databases › Manage My Databases** (o *MySQL® Databases*).
2. *Create New Database* › nombre `cafetravesia` › **Create Database**. Queda `cpuser_cafetravesia`.
3. No crees bases ni usuarios desde phpMyAdmin: cPanel no los registra y fallan los respaldos y las restauraciones ([advertencia oficial](https://docs.cpanel.net/cpanel/databases/manage-my-databases/)).

## 2. Fijar el charset utf8mb4_unicode_ci

cPanel crea la BD con el charset por defecto del servidor, que puede ser `latin1` o `utf8mb4_0900_ai_ci`. `npm run db:migrate` y `scripts/sql-bundle.mjs` fuerzan `utf8mb4_unicode_ci` en cada tabla. Aun así, fija también el valor por defecto de la base:

1. cPanel › **Databases › phpMyAdmin** › selecciona `cpuser_cafetravesia` en el panel izquierdo.
2. Pestaña **SQL** › ejecuta:

```sql
ALTER DATABASE `cpuser_cafetravesia` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SELECT @@character_set_database, @@collation_database, VERSION();
```

**Esperado:** `utf8mb4 | utf8mb4_unicode_ci | 8.0.x…` o `10.x.x-MariaDB`. Si la versión es menor que la mínima, detente y pide al hosting una actualización.

## 3. Crear el usuario de la aplicación

1. **Manage My Databases › Add New User**: usuario `ctapp`. Contraseña: botón **Password Generator**, 24 caracteres o más **sin comillas simples ni `\`** (van dentro de `config.php`). Guárdala en el gestor del cliente. **Create User**.
2. **Add User To Database**: `cpuser_ctapp` → `cpuser_cafetravesia` › **Add**.
3. En *Manage User Privileges* marca **solo**, para la fase de migración:

| Privilegio | ¿Para qué? | Después de migrar |
|---|---|---|
| SELECT, INSERT, UPDATE, DELETE | Operación normal de la app (DML) | **Se mantienen** |
| CREATE | `CREATE TABLE` de las migraciones y de `_migrations` | Se quita |
| ALTER | Migraciones futuras (`ALTER TABLE`) | Se quita |
| INDEX | `CREATE INDEX` (45 índices) | Se quita |
| DROP | Migraciones que eliminan columnas o tablas | Se quita |
| REFERENCES | Claves foráneas en migraciones futuras | Se quita |

No marques `ALL PRIVILEGES`, `LOCK TABLES`, `EXECUTE`, `CREATE ROUTINE`, `EVENT`, `TRIGGER`, `CREATE VIEW` ni `CREATE TEMPORARY TABLES`: la app no los usa.

4. **Make Changes**.

## 4. Usuario de respaldos (solo lectura)

1. **Add New User** `ctbackup`, con contraseña generada.
2. Agrégalo a `cpuser_cafetravesia` con: **SELECT, SHOW VIEW, TRIGGER, LOCK TABLES**.

## 5. Aplicar migraciones

**Antes de cualquier migración en producción** haz un respaldo (§7, «Respaldo manual»). La pasarela debe responder ([02](02-cpanel-pasarela-y-medios.md)).

### Opción A (recomendada): `npm run db:migrate` vía la pasarela

1. cPanel › **File Manager** › `/home/cpuser/gateway.cafetravesia.co/config.php` › *Edit* › `'allow_ddl' => true,` › *Save Changes*.
2. En tu equipo, desde la raíz del repo:

```bash
export DB_DRIVER=gateway
export DB_GATEWAY_URL=https://gateway.cafetravesia.co
read -rs DB_GATEWAY_SECRET && export DB_GATEWAY_SECRET   # pega el secreto (no queda en el historial)
node scripts/gateway-smoke.mjs --expect-ddl allowed       # todo ✓ antes de seguir
npm run db:migrate
npm run db:seed
```

**Esperado:**

```
→ 0000_init.sql (87 sentencias)
✓ Migraciones al día
✓ Contenido inicial cargado
```

Volver a correr el comando es seguro: solo aplica lo pendiente y el seed usa `INSERT IGNORE`. **Ojo:** `db:migrate` siempre ejecuta `CREATE TABLE IF NOT EXISTS _migrations`, así que **falla con `allow_ddl=false` aunque no haya nada pendiente**. Esto se verificó con `scripts/selftest.mjs`.

3. Vuelve a poner `'allow_ddl' => false,` en `config.php` y comprueba:

```bash
node scripts/gateway-smoke.mjs     # debe mostrar «✓ DDL bloqueado (allow_ddl=false)»
```

### Opción B: importar en phpMyAdmin

> **No importes `packages/db/migrations/*.sql` tal cual.** drizzle-kit separa las sentencias con `--> statement-breakpoint`, que **no** es un comentario válido en MySQL (exige `-- ` con espacio). La importación falla con `#1064 … near '--> statement-breakpoint'`: lo verificamos con el cliente `mysql` 8.4. Usa el archivo unificado:

1. En tu equipo: `node scripts/sql-bundle.mjs --out .work/cafe-travesia-migraciones.sql`. Para migraciones nuevas de una base ya migrada usa `--from 0001`.
2. cPanel › **phpMyAdmin** › selecciona `cpuser_cafetravesia` › pestaña **Importar** › *Examinar* › el archivo › Formato **SQL** › Juego de caracteres **utf-8** › **Importar**.
3. **Esperado:** «La importación se ejecutó exitosamente», con 43 tablas: 42 de la app y `_migrations`. El archivo registra cada migración en `_migrations`, así que `npm run db:migrate` no la repite. Importarlo dos veces falla con `#1050 Table … already exists` y no cambia nada.
4. Carga el contenido inicial. Requiere la pasarela, aunque `allow_ddl` puede quedar en false porque el seed es solo DML:

```bash
DB_DRIVER=gateway DB_GATEWAY_URL=https://gateway.cafetravesia.co DB_GATEWAY_SECRET='<secreto>' npm run db:seed
```

### Migraciones futuras

Se generan con `npm run db:generate` (ver [CONTRIBUTING.md](../../CONTRIBUTING.md#migraciones)). Deben ser **compatibles hacia atrás** (primero agregar y luego, en otro despliegue, eliminar), porque Instant Rollback de Vercel no revierte la BD. Orden: respaldo → `allow_ddl=true` → `db:migrate` → desplegar el código → `allow_ddl=false`.

## 6. Restringir los privilegios después de migrar

1. **Manage My Databases › Current Databases** › en `cpuser_cafetravesia`, clic en el usuario `cpuser_ctapp`.
2. Desmarca **CREATE, ALTER, INDEX, DROP, REFERENCES**. Quedan solo SELECT, INSERT, UPDATE y DELETE. **Make Changes**.
3. Verifica en phpMyAdmin › SQL:

```sql
SHOW GRANTS FOR 'cpuser_ctapp'@'localhost';
-- Esperado: GRANT SELECT, INSERT, UPDATE, DELETE ON `cpuser\_cafetravesia`.* TO …
```

Repite los pasos 3 de §3 y 1–2 de §5 cada vez que haya una migración nueva. Defensa en profundidad: aunque alguien active `allow_ddl` por error, el usuario no podrá ejecutar DDL.

## 7. Respaldos automáticos

### Respaldo del hosting

- cPanel › **Files › Backup** › *Partial Backups › Download a MySQL Database Backup* › `cpuser_cafetravesia` descarga un `.sql.gz` ([docs](https://docs.cpanel.net/cpanel/files/backup-for-cpanel/)). Úsalo como **respaldo manual** antes de cada migración y guárdalo fuera del servidor.
- Si el hosting ofrece JetBackup o respaldos remotos diarios, confirma con soporte la retención y que incluyan las bases de datos.

### Cron con mysqldump (diario, 14 días)

1. Credenciales del usuario de respaldos. En cPanel › **File Manager** (con *Show Hidden Files* activado) crea `/home/cpuser/.my.cnf`:

```ini
[client]
user=cpuser_ctbackup
password=CLAVE_DEL_USUARIO_CTBACKUP
host=localhost
```

   Luego *Permissions* › **600**.

2. Sube `scripts/backup-mysql.sh` a `/home/cpuser/bin/backup-mysql.sh` con permisos **700**. Crea la carpeta `/home/cpuser/backups/mysql` con permisos **700**, fuera de `public_html`.
3. cPanel › **Advanced › Cron Jobs** ([docs](https://docs.cpanel.net/cpanel/advanced/cron-jobs/)) › *Cron Email*: correo técnico (recibe los errores). *Add New Cron Job*: Minute `15`, Hour `3`, Day `*`, Month `*`, Weekday `*`. Command:

```bash
/bin/bash /home/cpuser/bin/backup-mysql.sh --db cpuser_cafetravesia --keep-days 14 >> /home/cpuser/backups/mysql/backup.log 2>&1
```

   Sin el script, un equivalente en una sola línea:

```bash
mysqldump --defaults-extra-file=/home/cpuser/.my.cnf --single-transaction --quick --no-tablespaces --default-character-set=utf8mb4 cpuser_cafetravesia | gzip -9 > /home/cpuser/backups/mysql/cpuser_cafetravesia-$(date +\%Y\%m\%d).sql.gz && find /home/cpuser/backups/mysql -name 'cpuser_cafetravesia-*.sql.gz' -mtime +14 -delete
```

   En crontab, `%` debe escaparse como `\%`. `--no-tablespaces` evita el error de privilegio `PROCESS` en MySQL 8.0.21 y posteriores.

4. Copia fuera del servidor: una vez por semana, descarga el último `.sql.gz` (File Manager › *Download*) al almacenamiento del cliente (Google Drive o similar). Un respaldo que solo vive en el mismo hosting no protege contra la pérdida del hosting.

## 8. Restauración

**Prueba (obligatoria una vez) y restauración selectiva**

1. Manage My Databases › crea `cpuser_restore`. Asigna `cpuser_ctapp` con todos los privilegios del §3, o usa phpMyAdmin con tu sesión de cPanel.
2. phpMyAdmin › `cpuser_restore` › **Importar** › el `.sql.gz`. phpMyAdmin acepta gzip; el límite de tamaño lo pone `upload_max_filesize`. Con Terminal (cPanel › Advanced › Terminal):

```bash
gunzip -c ~/backups/mysql/cpuser_cafetravesia-AAAAMMDD-HHMM.sql.gz | mysql --defaults-extra-file=~/.my.cnf cpuser_restore
```

   (Para esto el usuario de `.my.cnf` necesita permisos sobre `cpuser_restore`.)

3. Verifica: `SELECT COUNT(*) FROM orders; SELECT MAX(created_at) FROM orders;`

**Restauración de producción (incidente)**

1. cPanel › Cron Jobs: comenta las líneas de `/api/cron` y del respaldo, para que no corran cobros a medio restaurar.
2. Restaura en `cpuser_restore` (pasos anteriores) y verifica.
3. Cambio instantáneo, sin redeploy en Vercel: en `config.php`, `'name' => 'cpuser_restore'`. Asigna antes a `cpuser_ctapp` los privilegios DML sobre esa BD.
4. `node scripts/gateway-smoke.mjs` → todo ✓. `/admin/monitor` en verde.
5. Pedidos y pagos posteriores al respaldo: en el dashboard de Wompi › Transacciones, filtra desde la hora del respaldo y recrea manualmente en el CMS los pedidos aprobados que no existan. El cron solo concilia pedidos que **existen** en la BD.
6. Reactiva los cron. Cuando todo esté estable, puedes renombrar las bases (*Rename*) para volver al nombre original.

## Verificación

- `node scripts/gateway-smoke.mjs` muestra: `MySQL ≥ 5.7.8` (o `MariaDB ≥ 10.3`) ✓, `charset … utf8mb4` ✓, `tablas — 43 tablas` ✓, `migraciones aplicadas — 0000_init.sql` ✓ y `DDL bloqueado` ✓.
- `SHOW GRANTS` muestra solo SELECT, INSERT, UPDATE y DELETE para `cpuser_ctapp`.
- `ls -la ~/backups/mysql/` tiene un `.sql.gz` del día. `backup.log` termina en `OK …`.
- Hay una restauración de prueba en `cpuser_restore` con datos. Borra esa BD después.

## Si algo falla

| Síntoma | Causa probable | Solución |
|---|---|---|
| `#1064 near '--> statement-breakpoint'` al importar | Importaste el `.sql` crudo de drizzle | Usa `node scripts/sql-bundle.mjs` (§5 B) |
| `DDL deshabilitado en la pasarela (allow_ddl=false)` | `allow_ddl` está en false durante `db:migrate` | Actívalo temporalmente (§5 A.1) |
| `CREATE command denied to user` | Al usuario le faltan los privilegios DDL | Vuelve a marcarlos (§3) solo durante la migración |
| `Specified key was too long; max key length is 767 bytes` | Versión anterior a MySQL 5.7.7 / MariaDB 10.2, o `ROW_FORMAT=COMPACT` | Pide al hosting MySQL 5.7.8+ o MariaDB 10.3+ |
| `Incorrect string value: '\xF0\x9F…'` | Tablas en utf8 o latin1 | §2 y migrar con los scripts (fuerzan utf8mb4) |
| `mysqldump: Error: 'Access denied; you need … PROCESS privilege'` | Falta `--no-tablespaces` | Usa `scripts/backup-mysql.sh` |
| `Got packet bigger than 'max_allowed_packet'` al importar | Volcado grande | Importa por Terminal (`mysql`) o pide al hosting que lo amplíe |
| Rollback de una migración | — | Restaura el respaldo previo (§8) y haz Instant Rollback en Vercel ([05](05-vercel.md#rollback)) |
