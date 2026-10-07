import { customType } from 'drizzle-orm/mysql-core';

/**
 * JSON portable para MySQL 5.7+/8 y MariaDB 10.x (cPanel).
 * Se guarda como LONGTEXT (MariaDB trata JSON como alias de LONGTEXT) y se
 * serializa/parsea aquí, porque el driver proxy (pasarela PHP) devuelve texto.
 */
export const jsonText = <T>(name: string) =>
  customType<{ data: T; driverData: string }>({
    dataType() {
      return 'longtext';
    },
    toDriver(value: T) {
      return JSON.stringify(value ?? null);
    },
    fromDriver(value: unknown) {
      if (value === null || value === undefined) return null as T;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as unknown as T;
        }
      }
      return value as T; // mysql2 puede entregarlo ya parseado
    },
  })(name);
