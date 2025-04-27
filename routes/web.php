<?php

use App\Http\Controllers\RealOtpController;
use App\Http\Controllers\RechargeController;
use App\Http\Controllers\WalletController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

// Special route for payment callback that doesn't use CSRF protection
// This is the primary route that will be used for payment gateway callbacks
Route::any('/recharge/callback', [RechargeController::class, 'handleCallback'])
    ->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class])
    ->name('recharge.callback');

// Additional secure webhook endpoint if needed
Route::post('/api/payment/webhook', [RechargeController::class, 'handleWebhook'])
    ->name('payment.webhook');

// Public recharge result page - no auth required
Route::get('/recharge/public-result', [RechargeController::class, 'showPublicResult'])
    ->name('recharge.public.result');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [RealOtpController::class, 'dashboard'])->name('dashboard');
    
    // RealOTP API Routes
    Route::get('api/realotp/services', [RealOtpController::class, 'getServices'])->name('realotp.services');
    Route::get('api/realotp/number', [RealOtpController::class, 'getNumber'])->name('realotp.number');
    Route::get('api/realotp/status', [RealOtpController::class, 'getStatus'])->name('realotp.status');
    Route::get('api/realotp/cancel', [RealOtpController::class, 'cancelNumber'])->name('realotp.cancel');
    Route::get('api/realotp/purchases', [RealOtpController::class, 'getUserPurchases'])->name('realotp.purchases');
    Route::get('api/realotp/register-background-check', [RealOtpController::class, 'registerBackgroundCheck'])->name('realotp.register-background-check');

    // Wallet Recharge Routes
    Route::get('/recharge', [RechargeController::class, 'index'])->name('recharge');
    Route::post('/api/recharge/initiate', [RechargeController::class, 'initiateRecharge'])->name('recharge.initiate');
    Route::post('/api/recharge/check-status', [RechargeController::class, 'checkStatus'])->name('recharge.check-status');
    Route::get('/recharge/result', [RechargeController::class, 'showResult'])->name('recharge.result');

    // Wallet Routes
    Route::get('/wallet-transactions', [WalletController::class, 'index'])->name('wallet.transactions');
    Route::get('/api/wallet/transactions', [WalletController::class, 'getTransactions'])->name('wallet.get-transactions');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
