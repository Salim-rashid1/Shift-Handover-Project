<?php
declare(strict_types=1);

/**
 * Application settings for the Salim API.
 * Keep this file outside the public/ document root.
 */
function app_config(): array
{
    return [
        'env' => 'production',
        'timezone' => 'Africa/Nairobi',
        'origin' => 'http://localhost:5174',
        'session' => 'salim_ops_session',
        'sessionSameSite' => 'None',
        'corsMethods' => ['GET', 'POST', 'PATCH', 'OPTIONS'],
        'corsHeaders' => ['Authorization', 'Content-Type'],
    ];
}
