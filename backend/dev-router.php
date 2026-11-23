<?php
declare(strict_types=1);

// PHP's built-in server does not read Apache .htaccess. Use this router locally only.
$publicRoot = realpath(__DIR__ . '/public');
$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$candidate = realpath($publicRoot . $requestPath);
if ($candidate !== false && strpos($candidate, $publicRoot . DIRECTORY_SEPARATOR) === 0 && is_file($candidate)) {
    return false;
}
require $publicRoot . '/index.php';
