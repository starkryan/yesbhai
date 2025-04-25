<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiNoTokenMiddleware
{
    /**
     * Handle an incoming request without token validation.
     * This is specifically for payment gateway callbacks.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // No validation, just pass through for payment callbacks
        return $next($request);
    }
} 