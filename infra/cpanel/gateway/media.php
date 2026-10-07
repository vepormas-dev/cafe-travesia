<?php
/**
 * Almacenamiento de archivos en cPanel.
 *
 *  1) Subida directa desde el navegador (sin pasar por el límite de 4,5 MB de Vercel):
 *     POST multipart /media.php  campos: ticket, file
 *     El ticket lo emite el backend (solo a administradores) y vence en minutos:
 *       ticket = base64url(json{folder, maxBytes, exp, nonce}) . "." . hex(HMAC-SHA256(secret, payload))
 *
 *  2) Operaciones de servidor firmadas igual que db.php:
 *     POST JSON /media.php  { op: "delete", path }  | { op: "put", folder, name, mime, dataBase64 }
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';

ct_cors();
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ct_json(405, ['ok' => false, 'error' => 'Método no permitido']);
}

$cfg = ct_config();
$media = $cfg['media'];
$baseDir = rtrim((string)$media['dir'], '/');
$baseUrl = rtrim((string)$media['base_url'], '/');

function ct_safe_folder(string $folder): string
{
    $folder = strtolower(trim($folder, '/'));
    $folder = preg_replace('/[^a-z0-9\/_-]/', '', $folder) ?? 'general';
    $folder = preg_replace('#/+#', '/', str_replace('..', '', $folder)) ?? 'general';
    return $folder === '' ? 'general' : substr($folder, 0, 60);
}

function ct_ext_for(string $mime): string
{
    $map = [
        'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/avif' => 'avif',
        'image/gif' => 'gif', 'application/pdf' => 'pdf', 'video/mp4' => 'mp4',
    ];
    return $map[$mime] ?? 'bin';
}

function ct_store(string $tmpPath, string $folder, array $media, string $baseDir, string $baseUrl, bool $isUpload): array
{
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string)$finfo->file($tmpPath);
    if (!in_array($mime, $media['allowed_mime'], true)) {
        ct_json(415, ['ok' => false, 'error' => "Tipo de archivo no permitido ($mime)"]);
    }
    $size = (int)filesize($tmpPath);
    $folder = ct_safe_folder($folder);
    $rel = $folder . '/' . date('Y/m') . '/' . bin2hex(random_bytes(10)) . '.' . ct_ext_for($mime);
    $dest = $baseDir . '/' . $rel;
    if (!is_dir(dirname($dest)) && !mkdir(dirname($dest), 0755, true)) {
        ct_json(500, ['ok' => false, 'error' => 'No se pudo crear la carpeta']);
    }
    $ok = $isUpload ? move_uploaded_file($tmpPath, $dest) : rename($tmpPath, $dest);
    if (!$ok) {
        ct_json(500, ['ok' => false, 'error' => 'No se pudo guardar el archivo']);
    }
    @chmod($dest, 0644);
    $width = null;
    $height = null;
    if (strpos($mime, 'image/') === 0) {
        $dim = @getimagesize($dest);
        if ($dim) {
            $width = (int)$dim[0];
            $height = (int)$dim[1];
        }
    }
    return ['ok' => true, 'path' => $rel, 'url' => $baseUrl . '/' . $rel, 'mime' => $mime, 'size' => $size, 'width' => $width, 'height' => $height];
}

$contentType = (string)($_SERVER['CONTENT_TYPE'] ?? '');

// ---- 1) Subida con ticket (multipart) -------------------------------------
if (stripos($contentType, 'multipart/form-data') === 0) {
    $ticket = (string)($_POST['ticket'] ?? '');
    $parts = explode('.', $ticket);
    if (count($parts) !== 2) {
        ct_json(401, ['ok' => false, 'error' => 'Ticket inválido']);
    }
    [$payloadB64, $sig] = $parts;
    $expected = hash_hmac('sha256', $payloadB64, (string)$cfg['secret']);
    if (!hash_equals($expected, strtolower($sig))) {
        ct_json(401, ['ok' => false, 'error' => 'Ticket inválido']);
    }
    $payload = json_decode(ct_b64url_decode($payloadB64), true);
    if (!is_array($payload) || (int)($payload['exp'] ?? 0) < time()) {
        ct_json(401, ['ok' => false, 'error' => 'Ticket vencido']);
    }
    $file = $_FILES['file'] ?? null;
    if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        ct_json(400, ['ok' => false, 'error' => 'Archivo no recibido (código ' . (int)($file['error'] ?? -1) . ')']);
    }
    $max = min((int)($payload['maxBytes'] ?? $media['max_bytes']), (int)$media['max_bytes']);
    if ((int)$file['size'] > $max) {
        ct_json(413, ['ok' => false, 'error' => 'Archivo demasiado grande']);
    }
    ct_json(200, ct_store((string)$file['tmp_name'], (string)($payload['folder'] ?? 'general'), $media, $baseDir, $baseUrl, true));
}

// ---- 2) Operaciones de servidor (JSON firmado) -----------------------------
$body = (string)file_get_contents('php://input');
ct_verify_signature($body);
$req = json_decode($body, true);
if (!is_array($req)) {
    ct_json(400, ['ok' => false, 'error' => 'JSON inválido']);
}
$op = (string)($req['op'] ?? '');

if ($op === 'delete') {
    $path = (string)($req['path'] ?? '');
    if ($path === '' || strpos($path, '..') !== false || $path[0] === '/') {
        ct_json(400, ['ok' => false, 'error' => 'Ruta inválida']);
    }
    $full = realpath($baseDir . '/' . $path);
    $root = realpath($baseDir);
    if ($full === false || $root === false || strpos($full, $root . DIRECTORY_SEPARATOR) !== 0) {
        ct_json(200, ['ok' => true, 'deleted' => false]);
    }
    ct_json(200, ['ok' => true, 'deleted' => @unlink($full)]);
}

if ($op === 'put') {
    $data = base64_decode((string)($req['dataBase64'] ?? ''), true);
    if ($data === false || strlen($data) === 0 || strlen($data) > (int)$media['max_bytes']) {
        ct_json(400, ['ok' => false, 'error' => 'Datos inválidos']);
    }
    $tmp = tempnam(sys_get_temp_dir(), 'ct');
    file_put_contents($tmp, $data);
    ct_json(200, ct_store($tmp, (string)($req['folder'] ?? 'general'), $media, $baseDir, $baseUrl, false));
}

if ($op === 'stats') {
    $total = 0;
    $count = 0;
    if (is_dir($baseDir)) {
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($baseDir, FilesystemIterator::SKIP_DOTS));
        foreach ($it as $f) {
            if ($f->isFile()) {
                $total += $f->getSize();
                $count++;
            }
        }
    }
    ct_json(200, ['ok' => true, 'bytes' => $total, 'files' => $count, 'freeBytes' => @disk_free_space($baseDir) ?: null]);
}

ct_json(400, ['ok' => false, 'error' => 'op inválida']);
