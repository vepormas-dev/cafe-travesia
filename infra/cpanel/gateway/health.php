<?php
// Salud pública mínima (sin datos sensibles). Útil para monitores de uptime.
declare(strict_types=1);
require __DIR__ . '/lib.php';
$db = false;
try {
    $db = (bool)ct_pdo()->query('SELECT 1')->fetchColumn();
} catch (Throwable $e) {
    $db = false;
}
ct_json($db ? 200 : 503, ['ok' => $db, 'service' => 'cafe-travesia-gateway', 'version' => CT_GATEWAY_VERSION, 'time' => gmdate('c')]);
