<?php
declare(strict_types=1);

if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'lib.php') {
    http_response_code(404);
    exit;
}

const CT_GATEWAY_VERSION = '1.0.0';

function ct_config(): array
{
    static $cfg = null;
    if ($cfg === null) {
        $path = getenv('CT_GATEWAY_CONFIG') ?: __DIR__ . '/config.php';
        if (!is_file($path)) {
            ct_json(500, ['ok' => false, 'error' => 'Pasarela sin config.php']);
        }
        // Sin esto, opcache puede seguir sirviendo una versión vieja de config.php (p. ej. con
        // allow_ddl=true) durante opcache.revalidate_freq segundos, o indefinidamente si el hosting
        // desactiva validate_timestamps.
        if (function_exists('opcache_invalidate')) {
            opcache_invalidate($path, true);
        }
        $cfg = require $path;
    }
    return $cfg;
}

function ct_json(int $status, array $data): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function ct_header(string $name): string
{
    $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
    return (string)($_SERVER[$key] ?? '');
}

/** Verifica X-CT-Timestamp / X-CT-Signature = HMAC-SHA256(secret, "<ts>.<body>") */
function ct_verify_signature(string $body): void
{
    $cfg = ct_config();
    $ts = ct_header('X-CT-Timestamp');
    $sig = ct_header('X-CT-Signature');
    if ($ts === '' || $sig === '' || !ctype_digit($ts)) {
        ct_json(401, ['ok' => false, 'error' => 'Firma ausente']);
    }
    $skewMs = abs((int)(microtime(true) * 1000) - (int)$ts);
    if ($skewMs > ((int)($cfg['max_skew'] ?? 90)) * 1000) {
        ct_json(401, ['ok' => false, 'error' => 'Firma vencida (revisa el reloj del servidor)']);
    }
    $expected = hash_hmac('sha256', $ts . '.' . $body, (string)$cfg['secret']);
    if (!hash_equals($expected, strtolower($sig))) {
        ct_json(401, ['ok' => false, 'error' => 'Firma inválida']);
    }
}

function ct_pdo(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $db = ct_config()['db'];
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $db['host'], (int)($db['port'] ?? 3306), $db['name']);
        $pdo = new PDO($dsn, $db['user'], $db['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false, // tipos nativos (int/float) en resultados
            PDO::ATTR_STRINGIFY_FETCHES => false,
            PDO::ATTR_TIMEOUT => 8,
        ]);
        $pdo->exec("SET time_zone = '+00:00'");
        $pdo->exec("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
    }
    return $pdo;
}

function ct_b64url_decode(string $s): string
{
    return (string)base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4));
}

function ct_cors(): void
{
    $origin = ct_header('Origin');
    $allowed = ct_config()['cors_origins'] ?? [];
    if ($origin !== '' && in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Methods: POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
        header('Access-Control-Max-Age: 600');
    }
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
