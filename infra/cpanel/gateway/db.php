<?php
/**
 * Pasarela SQL de Café Travesía (cPanel).
 * Recibe sentencias parametrizadas firmadas por el backend en Vercel y las
 * ejecuta contra la MySQL/MariaDB local. Protocolo compatible con drizzle-orm/mysql-proxy.
 *
 *  POST /db.php  { op: "ping" }
 *                { op: "query", sql, params, method: "all"|"execute"|"objects" }
 *                { op: "batch", statements: [{ sql, params }] }   ← transacción atómica
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ct_json(405, ['ok' => false, 'error' => 'Método no permitido']);
}

$body = (string)file_get_contents('php://input');
if (strlen($body) > 8 * 1024 * 1024) {
    ct_json(413, ['ok' => false, 'error' => 'Solicitud demasiado grande']);
}
ct_verify_signature($body);

$req = json_decode($body, true);
if (!is_array($req)) {
    ct_json(400, ['ok' => false, 'error' => 'JSON inválido']);
}

const CT_DDL = '/^\s*(CREATE|ALTER|DROP|TRUNCATE|RENAME|GRANT|REVOKE)\b/i';
const CT_FORBIDDEN = '/\b(INTO\s+OUTFILE|INTO\s+DUMPFILE|LOAD_FILE\s*\(|LOAD\s+DATA)\b/i';

function ct_check_sql(string $sql): void
{
    if (preg_match(CT_FORBIDDEN, $sql)) {
        ct_json(403, ['ok' => false, 'error' => 'Sentencia no permitida']);
    }
    if (preg_match(CT_DDL, $sql) && !(ct_config()['allow_ddl'] ?? false)) {
        ct_json(403, ['ok' => false, 'error' => 'DDL deshabilitado en la pasarela (allow_ddl=false)']);
    }
}

function ct_bind(PDOStatement $st, array $params): void
{
    $i = 1;
    foreach ($params as $p) {
        if (is_int($p)) {
            $st->bindValue($i, $p, PDO::PARAM_INT);
        } elseif (is_bool($p)) {
            $st->bindValue($i, $p ? 1 : 0, PDO::PARAM_INT);
        } elseif ($p === null) {
            $st->bindValue($i, null, PDO::PARAM_NULL);
        } elseif (is_float($p)) {
            $st->bindValue($i, (string)$p, PDO::PARAM_STR);
        } elseif (is_array($p)) {
            $st->bindValue($i, json_encode($p, JSON_UNESCAPED_UNICODE), PDO::PARAM_STR);
        } else {
            $st->bindValue($i, (string)$p, PDO::PARAM_STR);
        }
        $i++;
    }
}

function ct_run(PDO $pdo, string $sql, array $params, string $method)
{
    ct_check_sql($sql);
    $st = $pdo->prepare($sql);
    ct_bind($st, $params);
    $st->execute();
    if ($method === 'all') {
        return $st->columnCount() > 0 ? $st->fetchAll(PDO::FETCH_NUM) : [];
    }
    if ($method === 'objects') {
        return $st->columnCount() > 0 ? $st->fetchAll(PDO::FETCH_ASSOC) : [];
    }
    return [['insertId' => (int)$pdo->lastInsertId(), 'affectedRows' => $st->rowCount()]];
}

$started = microtime(true);
try {
    $op = (string)($req['op'] ?? '');
    if ($op === 'ping') {
        $v = ct_pdo()->query('SELECT VERSION()')->fetchColumn();
        ct_json(200, ['ok' => true, 'version' => (string)$v, 'gateway' => CT_GATEWAY_VERSION, 'php' => PHP_VERSION]);
    }
    if ($op === 'query') {
        $method = (string)($req['method'] ?? 'all');
        if (!in_array($method, ['all', 'execute', 'objects'], true)) {
            ct_json(400, ['ok' => false, 'error' => 'method inválido']);
        }
        $rows = ct_run(ct_pdo(), (string)($req['sql'] ?? ''), (array)($req['params'] ?? []), $method);
        ct_json(200, ['ok' => true, 'rows' => $rows, 'ms' => (int)((microtime(true) - $started) * 1000)]);
    }
    if ($op === 'batch') {
        $statements = (array)($req['statements'] ?? []);
        if (count($statements) === 0 || count($statements) > 200) {
            ct_json(400, ['ok' => false, 'error' => 'Lote vacío o demasiado grande']);
        }
        $pdo = ct_pdo();
        $pdo->beginTransaction();
        try {
            $results = [];
            foreach ($statements as $s) {
                $results[] = ct_run($pdo, (string)($s['sql'] ?? ''), (array)($s['params'] ?? []), 'execute')[0];
            }
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
        ct_json(200, ['ok' => true, 'results' => $results]);
    }
    ct_json(400, ['ok' => false, 'error' => 'op inválida']);
} catch (PDOException $e) {
    $info = $e->errorInfo ?? [];
    error_log('[ct-gateway] ' . $e->getMessage());
    ct_json(400, [
        'ok' => false,
        'error' => $e->getMessage(),
        'sqlState' => (string)($info[0] ?? $e->getCode()),
        'errno' => (int)($info[1] ?? 0),
    ]);
} catch (Throwable $e) {
    error_log('[ct-gateway] ' . $e->getMessage());
    ct_json(500, ['ok' => false, 'error' => 'Error interno de la pasarela']);
}
