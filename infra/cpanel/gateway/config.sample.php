<?php
// Copia este archivo como config.php (NO lo subas a git) y completa los valores.
// Ubicación recomendada: /home/<usuario>/gateway.cafetravesia.co/config.php
return [
    // Secreto compartido con Vercel (DB_GATEWAY_SECRET). Genera 64+ caracteres:
    //   php -r "echo bin2hex(random_bytes(48));"
    'secret' => 'CAMBIAR_POR_SECRETO_LARGO',

    // Base de datos creada en cPanel → "Bases de datos MySQL"
    'db' => [
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'usuario_cafetravesia',
        'user' => 'usuario_ctapp',
        'pass' => 'CAMBIAR',
    ],

    // Permite CREATE/ALTER/DROP. Déjalo en false en producción y actívalo solo
    // durante `npm run db:migrate` (o importa las migraciones en phpMyAdmin).
    'allow_ddl' => false,

    // Ventana anti-replay de la firma (segundos)
    'max_skew' => 90,

    // Almacenamiento de archivos (imágenes del CMS, PDFs, adjuntos)
    'media' => [
        // Carpeta física servida por Apache en el subdominio de medios
        'dir' => '/home/usuario/media.cafetravesia.co',
        // URL pública de esa carpeta
        'base_url' => 'https://media.cafetravesia.co',
        'max_bytes' => 15 * 1024 * 1024,
        'allowed_mime' => ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'application/pdf', 'video/mp4'],
    ],

    // Orígenes autorizados para subir archivos directo desde el navegador (CORS)
    'cors_origins' => [
        'https://cafetravesia.co',
        'https://www.cafetravesia.co',
    ],
];
