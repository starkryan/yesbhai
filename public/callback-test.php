<?php

// This is a simple test file to verify that the callback URL is accessible
// It should be accessible even without a CSRF token

echo json_encode([
    'status' => 'success',
    'timestamp' => time(),
    'message' => 'The callback endpoint is accessible. This file helps verify that /recharge/callback can be accessed without CSRF token.'
]); 