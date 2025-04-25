<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Payment Gateway Settings
    |--------------------------------------------------------------------------
    |
    | These settings are used for configuring the payment gateway integration.
    |
    */

    'gateways' => [
        'apnabestupi' => [
            'url' => env('PAYMENT_GATEWAY_URL', 'https://apnabestupi.in'),
            'secret' => env('PAYMENT_GATEWAY_SECRET', 'c0615930448ece24cc73687dca0aac0d'),
            'callback_url' => env('PAYMENT_CALLBACK_URL', '/recharge/callback'),
            'webhook_url' => env('PAYMENT_WEBHOOK_URL', '/api/payment/webhook'),
            'timeout' => env('PAYMENT_TIMEOUT', 30), // in minutes
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Security Settings
    |--------------------------------------------------------------------------
    |
    | Security settings for payment processing
    |
    */
    'verify_signature' => env('PAYMENT_VERIFY_SIGNATURE', false),
    'verify_ip' => env('PAYMENT_VERIFY_IP', false),
    'allowed_ips' => explode(',', env('PAYMENT_ALLOWED_IPS', '')),
]; 