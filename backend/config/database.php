<?php
declare(strict_types=1);
require_once __DIR__ . '/app.php';

function database_config(): array
{
    return [
        // Hosted cPanel database. Keep this configuration outside the public document root.
        'host' => 'localhost',
        'port' => 3307,
        'name' => 'salim_shift_handover',
        'username' => 'root',
        'password' => '',
    ];
}

function db(): PDO
{
    static $pdo;
    if ($pdo instanceof PDO) return $pdo;

    $config = database_config();
    foreach (['host', 'name', 'username'] as $required) {
        if (!is_string($config[$required]) || $config[$required] === '') {
            throw new RuntimeException('Database configuration is incomplete');
        }
    }
    // Local MySQL accounts (such as the default XAMPP root account) may
    // intentionally have an empty password. Keep the value a string so PDO
    // receives an explicit empty password rather than a missing setting.
    if (!isset($config['password']) || !is_string($config['password'])) {
        throw new RuntimeException('Database configuration is incomplete');
    }
    if (!is_int($config['port']) || $config['port'] < 1 || $config['port'] > 65535) {
        throw new RuntimeException('Database configuration is invalid');
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $config['host'],
        $config['port'],
        $config['name']
    );

    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}
