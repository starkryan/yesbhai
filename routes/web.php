<?php

use App\Http\Controllers\RealOtpController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [RealOtpController::class, 'dashboard'])->name('dashboard');
    
    // RealOTP API Routes
    Route::get('api/realotp/services', [RealOtpController::class, 'getServices'])->name('realotp.services');
    Route::get('api/realotp/number', [RealOtpController::class, 'getNumber'])->name('realotp.number');
    Route::get('api/realotp/status', [RealOtpController::class, 'getStatus'])->name('realotp.status');
    Route::get('api/realotp/cancel', [RealOtpController::class, 'cancelNumber'])->name('realotp.cancel');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
