<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Models\OtpPurchase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;

class RealOtpController extends Controller
{
    /**
     * Get services data from RealOTP API
     */
    public function getServices()
    {
        try {
            // Check if we have cached data first
            if (Cache::has('realotp_services')) {
                return response()->json([
                    'success' => true,
                    'data' => Cache::get('realotp_services'),
                    'source' => 'cache'
                ]);
            }

            $apiKey = env('REAL_OTP_API_SECRET');
            $apiUrl = env('REAL_OTP_API_URL');
            
            // Set a longer timeout (30 seconds)
            $response = Http::timeout(30)->get($apiUrl, [
                'api_key' => $apiKey,
                'action' => 'getServices',
            ]);
            
            if ($response->successful()) {
                $data = $response->json();
                
                // Cache the successful response for 30 minutes
                Cache::put('realotp_services', $data, now()->addMinutes(30));
                
                return response()->json([
                    'success' => true,
                    'data' => $data,
                    'source' => 'api'
                ]);
            }
            
            // If API fails but we have a fallback JSON, use that
            if (file_exists(storage_path('app/realotp_fallback.json'))) {
                $fallbackData = json_decode(file_get_contents(storage_path('app/realotp_fallback.json')), true);
                return response()->json([
                    'success' => true,
                    'data' => $fallbackData,
                    'source' => 'fallback'
                ]);
            }
            
            // Log the failure for debugging
            Log::error('RealOTP API failed with status: ' . $response->status());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch data from RealOTP API: ' . $response->status(),
            ], 400);
            
        } catch (\Exception $e) {
            // Log the exception
            Log::error('RealOTP API Exception: ' . $e->getMessage());
            
            // Try to load from cache even if it's expired as a fallback
            if (Cache::has('realotp_services')) {
                return response()->json([
                    'success' => true,
                    'data' => Cache::get('realotp_services'),
                    'source' => 'emergency_cache'
                ]);
            }
            
            // Last resort - use the sample data we received in the query
            $sampleData = $this->getSampleData();
            
            // Store this sample data as our fallback file
            if (!file_exists(storage_path('app/realotp_fallback.json'))) {
                file_put_contents(storage_path('app/realotp_fallback.json'), json_encode($sampleData));
            }
            
            return response()->json([
                'success' => true,
                'data' => $sampleData,
                'source' => 'sample',
                'original_error' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * Request a phone number from RealOTP API
     */
    public function getNumber(Request $request)
    {
        try {
            $serviceCode = $request->query('service_code');
            $serverCode = $request->query('server_code');
            $serviceName = $request->query('service_name', 'Unknown Service');
            
            if (!$serviceCode || !$serverCode) {
                return response()->json([
                    'success' => false,
                    'message' => 'Missing required parameters: service_code and server_code are required',
                ], 400);
            }
            
            // Get the price for this service
            $price = $this->getServicePrice($serviceCode, $serverCode);
            
            // Verify user authentication
            if (!Auth::check()) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated',
                ], 401);
            }
            
            $user = Auth::user();
            
            // Check if price is set
            if (!$price) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unable to determine price for this service',
                ], 400);
            }
            
            // Check user balance
            if (!$user->hasSufficientBalance((float)$price)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient wallet balance. Please recharge your wallet.',
                    'current_balance' => $user->available_balance,
                    'required_price' => $price,
                ], 403);
            }
            
            $apiKey = env('REAL_OTP_API_SECRET');
            $apiUrl = env('REAL_OTP_API_URL');
            
            // Set a longer timeout (20 seconds)
            $response = Http::timeout(20)->get($apiUrl, [
                'api_key' => $apiKey,
                'action' => 'getNumber',
                'service' => $serviceCode,
                'server' => $serverCode,
            ]);
            
            Log::info('RealOTP getNumber response: ' . $response->body());
            
            // Check response format
            $responseBody = $response->body();
            
            // The API might return: ACCESS_NUMBER:order_id:phone_number
            if (str_starts_with($responseBody, 'ACCESS_NUMBER:')) {
                $parts = explode(':', $responseBody);
                if (count($parts) >= 3) {
                    // Access structure is ACCESS_NUMBER:order_id:phone_number
                    $orderId = $parts[1];
                    $phoneNumber = $parts[2];
                    
                    // Begin database transaction
                    DB::beginTransaction();
                    
                    try {
                        // Place a hold on the user's wallet instead of immediately deducting
                        // We'll only finalize the transaction when the OTP is received
                        
                        // Save the purchase in database
                        $otpPurchase = OtpPurchase::create([
                            'user_id' => $user->id,
                            'order_id' => $orderId,
                            'phone_number' => $phoneNumber,
                            'service_name' => $serviceName,
                            'service_code' => $serviceCode,
                            'server_code' => $serverCode,
                            'price' => $price,
                            'status' => 'waiting',
                        ]);
                        
                        // Create a wallet transaction record with 'pending' status
                        \App\Models\WalletTransaction::create([
                            'user_id' => $user->id,
                            'amount' => -1 * (float)$price,
                            'transaction_type' => 'purchase',
                            'description' => "OTP purchase: {$serviceName} (#{$orderId})",
                            'reference_id' => $orderId,
                            'status' => 'pending', // We'll update this to 'completed' when OTP received
                            'metadata' => json_encode([
                                'service_code' => $serviceCode,
                                'server_code' => $serverCode,
                                'phone_number' => $phoneNumber,
                            ]),
                        ]);
                        
                        // Place a temporary hold on the user's wallet balance by creating a reserved_balance field
                        // This prevents users from double-spending their balance while waiting for OTPs
                        if (!Schema::hasColumn('users', 'reserved_balance')) {
                            // This will only execute once for the first user after deployment
                            Schema::table('users', function (Blueprint $table) {
                                $table->decimal('reserved_balance', 10, 2)->default(0.00)->after('wallet_balance');
                            });
                        }
                        
                        // Reserve the amount from user's balance
                        $user->reserved_balance = $user->reserved_balance + (float)$price;
                        $user->save();
                        
                        // Commit transaction if everything is successful
                        DB::commit();
                        
                    } catch (\Exception $e) {
                        // Roll back transaction if there's any error
                        DB::rollBack();
                        Log::error('Transaction error: ' . $e->getMessage());
                        
                        return response()->json([
                            'success' => false,
                            'message' => 'Failed to process transaction: ' . $e->getMessage(),
                        ], 500);
                    }
                    
                    return response()->json([
                        'success' => true,
                        'phone_number' => $phoneNumber,
                        'order_id' => $orderId,
                        'price' => $price,
                        'wallet_balance' => $user->wallet_balance,
                        'raw_response' => $responseBody,
                    ]);
                }
            }
            
            // Handle error responses
            if (str_starts_with($responseBody, 'NO_NUMBERS') || 
                str_starts_with($responseBody, 'NO_BALANCE') || 
                str_starts_with($responseBody, 'ERROR') ||
                str_starts_with($responseBody, 'BAD_')) {
                return response()->json([
                    'success' => false,
                    'message' => $responseBody,
                ], 400);
            }
            
            // Unknown response format
            return response()->json([
                'success' => false,
                'message' => 'Unexpected API response: ' . $responseBody,
            ], 400);
            
        } catch (\Exception $e) {
            Log::error('RealOTP getNumber error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
            ], 500);
        }
    }
    
    /**
     * Check the status of an OTP order
     */
    public function getStatus(Request $request)
    {
        $orderId = $request->query('order_id');
        $timeoutOccurred = $request->query('timeout') === 'true';
        
        if (!$orderId) {
            return response()->json([
                'success' => false,
                'message' => 'Missing required parameter: order_id',
            ], 400);
        }
        
        // First check our database for the purchase
        $purchase = OtpPurchase::where('order_id', $orderId)->first();
        
        if (!$purchase) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found',
            ], 404);
        }
        
        // Only allow the owner of the purchase to check the status
        if (Auth::id() !== $purchase->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access',
            ], 403);
        }
        
        // If the purchase is already completed or cancelled, return the cached result
        if ($purchase->status === 'completed') {
            return response()->json([
                'success' => true,
                'status' => 'completed',
                'verification_code' => $purchase->verification_code,
                'phone_number' => $purchase->phone_number,
            ]);
        }
        
        if ($purchase->status === 'cancelled') {
            return response()->json([
                'success' => true,
                'status' => 'cancelled',
                'phone_number' => $purchase->phone_number,
            ]);
        }
        
        // If a timeout has occurred, automatically cancel the order and refund
        if ($timeoutOccurred && $purchase->status === 'waiting') {
            return $this->handleTimeout($orderId, $purchase);
        }

        try {
            $apiKey = env('REAL_OTP_API_SECRET');
            $apiUrl = env('REAL_OTP_API_URL');
            
            $response = Http::timeout(20)->get($apiUrl, [
                'api_key' => $apiKey,
                'action' => 'getStatus',
                'id' => $orderId,
            ]);
            
            // Log response for debugging
            Log::info('RealOTP getStatus response: ' . $response->body());
            
            $responseBody = $response->body();
            
            // Check for verification code - response format: STATUS_OK:SMS_CODE
            if (str_starts_with($responseBody, 'STATUS_OK:')) {
                $parts = explode(':', $responseBody);
                if (count($parts) >= 2) {
                    $verificationCode = $parts[1];
                    
                    // Update the purchase record
                    $purchase->verification_code = $verificationCode;
                    $purchase->status = 'completed';
                    $purchase->verification_received_at = now();
                    $purchase->save();
                    
                    // Update the pending wallet transaction to complete the deduction
                    $transaction = \App\Models\WalletTransaction::where('user_id', $purchase->user_id)
                        ->where('transaction_type', 'purchase')
                        ->where('description', "OTP purchase: {$purchase->service_name} (#{$purchase->order_id})")
                        ->where('status', 'pending')
                        ->first();
                    
                    if ($transaction) {
                        $transaction->status = 'completed';
                        $transaction->save();
                    }
                    
                    return response()->json([
                        'success' => true,
                        'status' => 'completed',
                        'verification_code' => $verificationCode,
                        'phone_number' => $purchase->phone_number,
                        'raw_response' => $responseBody,
                    ]);
                }
            }
            // Check for waiting status - response format: STATUS_WAIT_CODE
            else if ($responseBody === 'STATUS_WAIT_CODE') {
                return response()->json([
                    'success' => true,
                    'status' => 'waiting',
                    'phone_number' => $purchase->phone_number,
                    'raw_response' => $responseBody,
                ]);
            }
            // Check for cancelled or expired status
            else if ($responseBody === 'STATUS_CANCEL' || str_starts_with($responseBody, 'CANCEL_')) {
                $purchase->status = 'cancelled';
                $purchase->cancelled_at = now();
                $purchase->save();
                
                // Refund the user's wallet
                if ($purchase->price) {
                    $user = $purchase->user;
                    $price = (float) $purchase->price;
                    
                    // Update the pending transaction to 'cancelled'
                    $transaction = \App\Models\WalletTransaction::where('user_id', $user->id)
                        ->where('transaction_type', 'purchase')
                        ->where('description', "OTP purchase: {$purchase->service_name} (#{$purchase->order_id})")
                        ->where('status', 'pending')
                        ->first();
                    
                    if ($transaction) {
                        $transaction->status = 'cancelled';
                        $transaction->save();
                    }
                }
                
                return response()->json([
                    'success' => true,
                    'status' => 'cancelled',
                    'phone_number' => $purchase->phone_number,
                    'raw_response' => $responseBody,
                ]);
            }
            
            // If none of the expected response formats are found
            return response()->json([
                'success' => false,
                'message' => 'Unexpected response from OTP service: ' . $responseBody,
                'phone_number' => $purchase->phone_number,
                'raw_response' => $responseBody,
            ]);
            
        } catch (\Exception $e) {
            Log::error('RealOTP getStatus error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error checking OTP status: ' . $e->getMessage(),
                'phone_number' => $purchase->phone_number,
            ]);
        }
    }
    
    /**
     * Handle timeout for an OTP purchase
     * 
     * @param string $orderId
     * @param \App\Models\OtpPurchase $purchase
     * @return \Illuminate\Http\JsonResponse
     */
    private function handleTimeout($orderId, $purchase)
    {
        Log::info('OTP Timeout - Automatically cancelling order', ['order_id' => $orderId]);
        
        // Security check - verify purchase is not already cancelled or completed
        if ($purchase->status !== 'waiting') {
            Log::warning('Attempted to timeout process a non-waiting OTP purchase', [
                'order_id' => $orderId, 
                'current_status' => $purchase->status
            ]);
            
            return response()->json([
                'success' => true,
                'status' => $purchase->status,
                'message' => 'Order is already processed',
                'phone_number' => $purchase->phone_number,
            ]);
        }
        
        try {
            // Call the RealOTP API to cancel the number
            $apiKey = env('REAL_OTP_API_SECRET');
            $apiUrl = env('REAL_OTP_API_URL');
            
            $response = Http::timeout(20)->get($apiUrl, [
                'api_key' => $apiKey,
                'action' => 'setStatus',
                'status' => '8', // Status code 8 for cancel
                'id' => $orderId,
            ]);
            
            $responseBody = $response->body();
            Log::info('RealOTP timeout cancellation response', ['response' => $responseBody, 'order_id' => $orderId]);
            
            // Use a transaction to ensure all database operations happen atomically
            DB::beginTransaction();
            
            try {
                $user = $purchase->user;
                
                // Update purchase record to cancelled
                $purchase->update([
                    'status' => 'cancelled',
                    'cancelled_at' => now(),
                    'cancellation_reason' => 'Timeout - auto-cancelled'
                ]);
                
                // Get the pending transaction for this order
                $transaction = \App\Models\WalletTransaction::where('reference_id', $orderId)
                    ->where('user_id', $user->id)
                    ->where('status', 'pending')
                    ->first();
                
                if ($transaction) {
                    // Mark transaction as cancelled
                    $transaction->update([
                        'status' => 'cancelled',
                    ]);
                    
                    // Release the reserved balance
                    $price = abs($transaction->amount);
                    $user->reserved_balance -= $price;
                    $user->save();
                    
                    // Create a refund record
                    \App\Models\WalletTransaction::create([
                        'user_id' => $user->id,
                        'amount' => $price, // Positive amount for refund
                        'transaction_type' => 'refund',
                        'description' => "Refund for timed-out OTP: {$purchase->service_name} (#{$orderId})",
                        'reference_id' => $orderId,
                        'status' => 'completed',
                        'metadata' => json_encode([
                            'original_transaction_id' => $transaction->id,
                            'reason' => 'SMS timeout',
                            'response' => $responseBody
                        ]),
                    ]);
                    
                    $refundMessage = "Your payment of ₹{$price} has been refunded due to SMS timeout.";
                } else {
                    $refundMessage = "No pending transaction found for this order.";
                    Log::warning('No pending transaction found for timed-out OTP', [
                        'order_id' => $orderId,
                        'user_id' => $user->id
                    ]);
                }
                
                DB::commit();
                
                return response()->json([
                    'success' => true,
                    'status' => 'cancelled',
                    'message' => 'Order automatically cancelled due to timeout. ' . $refundMessage,
                    'phone_number' => $purchase->phone_number,
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Error processing OTP timeout cancellation: ' . $e->getMessage(), [
                    'order_id' => $orderId,
                    'exception' => $e->getTraceAsString()
                ]);
                
                // Return error but don't expose details to user
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to cancel the timed-out OTP and process refund.',
                    'status' => 'failed'
                ], 500);
            }
        } catch (\Exception $e) {
            Log::error('Error during OTP timeout cancellation API call: ' . $e->getMessage(), [
                'order_id' => $orderId,
                'exception' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel the timed-out OTP with the provider.',
                'status' => 'failed'
            ], 500);
        }
    }
    
    /**
     * Cancel a phone number activation
     */
    public function cancelNumber(Request $request)
    {
        try {
            $orderId = $request->query('order_id');
            
            if (!$orderId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Missing required parameter: order_id is required',
                ], 400);
            }
            
            $apiKey = env('REAL_OTP_API_SECRET');
            $apiUrl = env('REAL_OTP_API_URL');
            
            $response = Http::timeout(20)->get($apiUrl, [
                'api_key' => $apiKey,
                'action' => 'setStatus',
                'status' => '8', // Status code 8 for cancel
                'id' => $orderId,
            ]);
            
            Log::info('RealOTP cancelNumber response: ' . $response->body());
            
            $responseBody = $response->body();
            
            // Check for success response
            if ($responseBody === 'ACCESS_CANCEL' || $responseBody === 'SUCCESS_CANCEL') {
                // Update the purchase record if exists
                if (Auth::check()) {
                    DB::beginTransaction();
                    
                    try {
                        $user = Auth::user();
                        $purchase = OtpPurchase::where('order_id', $orderId)
                            ->where('user_id', $user->id)
                            ->first();
                        
                        if ($purchase && $purchase->status === 'waiting') {
                            // Update purchase record
                            $purchase->update([
                                'status' => 'cancelled',
                                'cancelled_at' => now(),
                            ]);
                            
                            // Get the pending transaction for this order
                            $transaction = \App\Models\WalletTransaction::where('reference_id', $orderId)
                                ->where('user_id', $user->id)
                                ->where('status', 'pending')
                                ->first();
                                
                            if ($transaction) {
                                // Mark transaction as cancelled
                                $transaction->update([
                                    'status' => 'cancelled',
                                ]);
                                
                                // Release the reserved balance
                                $price = abs($transaction->amount);
                                $user->reserved_balance -= $price;
                                $user->save();
                                
                                // Create a refund record
                                \App\Models\WalletTransaction::create([
                                    'user_id' => $user->id,
                                    'amount' => $price, // Positive amount for refund
                                    'transaction_type' => 'refund',
                                    'description' => "Refund for cancelled OTP: {$purchase->service_name} (#{$orderId})",
                                    'reference_id' => $orderId,
                                    'status' => 'completed',
                                    'metadata' => json_encode([
                                        'original_transaction_id' => $transaction->id,
                                        'reason' => 'User cancelled'
                                    ]),
                                ]);
                            }
                            
                            DB::commit();
                        }
                    } catch (\Exception $e) {
                        DB::rollBack();
                        Log::error('Error processing OTP cancellation: ' . $e->getMessage());
                    }
                }
                
                return response()->json([
                    'success' => true,
                    'message' => 'Number cancelled successfully',
                    'raw_response' => $responseBody,
                ]);
            }
            
            // Handle NO_ACTIVATION error explicitly with a clearer message
            if ($responseBody === 'NO_ACTIVATION') {
                return response()->json([
                    'success' => false,
                    'message' => 'No active number found for this order ID. The number might have already expired or been cancelled.',
                    'raw_response' => $responseBody,
                ], 400);
            }
            
            // Handle other error responses
            return response()->json([
                'success' => false,
                'message' => $responseBody,
                'raw_response' => $responseBody,
            ], 400);
        } catch (\Exception $e) {
            Log::error('RealOTP cancelNumber error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
            ], 500);
        }
    }
    
    /**
     * Dashboard with RealOTP services data
     */
    public function dashboard()
    {
        return Inertia::render('dashboard');
    }
    
    /**
     * Get sample data as a fallback
     */
    private function getSampleData()
    {
        return [
            "168" => [
                [
                    "service_code" => "hn",
                    "server_code" => "19",
                    "price" => "7.20"
                ]
            ],
            "1688" => [
                [
                    "service_code" => "1688",
                    "server_code" => "16",
                    "price" => "9.80"
                ],
                [
                    "service_code" => "1688",
                    "server_code" => "13",
                    "price" => "9.00"
                ]
            ],
            "" => [
                [
                    "service_code" => "jr",
                    "server_code" => "19",
                    "price" => "12.60"
                ],
                [
                    "service_code" => "pl",
                    "server_code" => "19",
                    "price" => "4.50"
                ],
                [
                    "service_code" => "cy",
                    "server_code" => "19",
                    "price" => "7.20"
                ],
                [
                    "service_code" => "yb",
                    "server_code" => "19",
                    "price" => "5.40"
                ],
                [
                    "service_code" => "tk",
                    "server_code" => "19",
                    "price" => "2.70"
                ],
                [
                    "service_code" => "ya",
                    "server_code" => "1",
                    "price" => "5.64"
                ],
                [
                    "service_code" => "md",
                    "server_code" => "19",
                    "price" => "5.40"
                ],
                [
                    "service_code" => "ktc",
                    "server_code" => "19",
                    "price" => "2.70"
                ],
                [
                    "service_code" => "vk",
                    "server_code" => "19",
                    "price" => "4.50"
                ],
                [
                    "service_code" => "ym",
                    "server_code" => "19",
                    "price" => "4.50"
                ],
                [
                    "service_code" => "ya",
                    "server_code" => "19",
                    "price" => "2.70"
                ],
                [
                    "service_code" => "we",
                    "server_code" => "19",
                    "price" => "4.50"
                ],
                [
                    "service_code" => "mg",
                    "server_code" => "19",
                    "price" => "2.70"
                ]
            ],
            " " => [
                [
                    "service_code" => "rj",
                    "server_code" => "19",
                    "price" => "3.60"
                ]
            ],
            "01slots" => [
                [
                    "service_code" => "01slots",
                    "server_code" => "2",
                    "price" => "7.80"
                ]
            ],
            "01Slots" => [
                [
                    "service_code" => "lss",
                    "server_code" => "19",
                    "price" => "12.60"
                ]
            ],
            "Zomato" => [
                [
                    "service_code" => "dy",
                    "server_code" => "1",
                    "price" => "5.64"
                ],
                [
                    "service_code" => "dy",
                    "server_code" => "19",
                    "price" => "9.00"
                ]
            ],
            "Dream11" => [
                [
                    "service_code" => "dr11",
                    "server_code" => "2",
                    "price" => "9.00"
                ],
                [
                    "service_code" => "dr11",
                    "server_code" => "3",
                    "price" => "10.50"
                ],
                [
                    "service_code" => "dr11",
                    "server_code" => "4",
                    "price" => "15.00"
                ]
            ]
        ];
    }

    /**
     * Get price for a specific service and server
     */
    protected function getServicePrice($serviceCode, $serverCode)
    {
        $services = null;
        
        // First try to get from cache
        if (Cache::has('realotp_services')) {
            $services = Cache::get('realotp_services');
        }
        
        // If not in cache or cache is empty, get from fallback
        if (!$services && file_exists(storage_path('app/realotp_fallback.json'))) {
            $services = json_decode(file_get_contents(storage_path('app/realotp_fallback.json')), true);
        }
        
        // If still nothing, use sample data
        if (!$services) {
            $services = $this->getSampleData();
        }
        
        // Search for the price
        foreach ($services as $serviceName => $serviceItems) {
            foreach ($serviceItems as $item) {
                if ($item['service_code'] === $serviceCode && $item['server_code'] === $serverCode) {
                    return $item['price'];
                }
            }
        }
        
        return null;
    }
    
    /**
     * Get user's OTP purchases
     */
    public function getUserPurchases()
    {
        if (!Auth::check()) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated',
            ], 401);
        }
        
        $purchases = OtpPurchase::where('user_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->paginate(10);
            
        return response()->json([
            'success' => true,
            'data' => $purchases,
        ]);
    }

    /**
     * Register a background check for an OTP order
     * This allows the server to track an OTP even after the user closes the browser
     */
    public function registerBackgroundCheck(Request $request)
    {
        $orderId = $request->query('order_id');
        
        if (!$orderId) {
            return response()->json([
                'success' => false,
                'message' => 'Missing required parameter: order_id',
            ], 400);
        }
        
        // First check our database for the purchase
        $purchase = OtpPurchase::where('order_id', $orderId)->first();
        
        if (!$purchase) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found',
            ], 404);
        }
        
        // Only allow the owner of the purchase to register a background check
        if (Auth::id() !== $purchase->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access',
            ], 403);
        }
        
        // Only allow background checks for orders that are still waiting
        if ($purchase->status !== 'waiting') {
            return response()->json([
                'success' => true,
                'message' => 'OTP is no longer in waiting status',
                'status' => $purchase->status,
            ]);
        }
        
        // Update the purchase to mark it for background monitoring
        $purchase->background_monitoring = true;
        $purchase->last_background_check = now();
        $purchase->save();
        
        return response()->json([
            'success' => true,
            'message' => 'Background check registered successfully',
        ]);
    }

    /**
     * Process background OTP checks
     * This method should be called by a scheduled task or queue worker
     */
    public function processBackgroundChecks()
    {
        // Find all purchases that are in waiting status and have background monitoring enabled
        $purchases = OtpPurchase::where('status', 'waiting')
            ->where('background_monitoring', true)
            ->get();
        
        $results = [
            'total' => $purchases->count(),
            'processed' => 0,
            'completed' => 0,
            'still_waiting' => 0,
            'errors' => 0,
            'timed_out' => 0,
        ];
        
        foreach ($purchases as $purchase) {
            try {
                $results['processed']++;
                
                // Check if the purchase has timed out (created more than 5 minutes ago)
                if ($purchase->created_at && now()->diffInSeconds($purchase->created_at) > 300) {
                    // Call our timeout handler to cancel and refund
                    $timeoutResult = $this->handleTimeout($purchase->order_id, $purchase);
                    if ($timeoutResult->status() === 200) {
                        $results['timed_out']++;
                    } else {
                        $results['errors']++;
                    }
                    continue;
                }
                
                // Only check orders every minute to avoid excessive API calls
                if ($purchase->last_background_check && 
                    $purchase->last_background_check->diffInSeconds(now()) < 60) {
                    $results['still_waiting']++;
                    continue;
                }
                
                $apiKey = env('REAL_OTP_API_SECRET');
                $apiUrl = env('REAL_OTP_API_URL');
                
                $response = Http::timeout(10)->get($apiUrl, [
                    'api_key' => $apiKey,
                    'action' => 'getStatus',
                    'id' => $purchase->order_id,
                ]);
                
                // Update the last check time
                $purchase->last_background_check = now();
                $purchase->save();
                
                $responseBody = $response->body();
                
                // Check for verification code - response format: STATUS_OK:SMS_CODE
                if (str_starts_with($responseBody, 'STATUS_OK:')) {
                    $parts = explode(':', $responseBody);
                    if (count($parts) >= 2) {
                        $verificationCode = $parts[1];
                        
                        // Update the purchase record
                        $purchase->verification_code = $verificationCode;
                        $purchase->status = 'completed';
                        $purchase->verification_received_at = now();
                        $purchase->background_monitoring = false; // No longer needs monitoring
                        $purchase->save();
                        
                        // Update the pending wallet transaction to complete the deduction
                        $transaction = \App\Models\WalletTransaction::where('user_id', $purchase->user_id)
                            ->where('transaction_type', 'purchase')
                            ->where('description', "OTP purchase: {$purchase->service_name} (#{$purchase->order_id})")
                            ->where('status', 'pending')
                            ->first();
                        
                        if ($transaction) {
                            $transaction->status = 'completed';
                            $transaction->save();
                        }
                        
                        // Todo: Send notification to user about the completed OTP
                        // This could be via email, SMS, or push notification
                        
                        $results['completed']++;
                    }
                }
                // Check for waiting status - just update last check time
                else if ($responseBody === 'STATUS_WAIT_CODE') {
                    $results['still_waiting']++;
                }
                // Check for cancelled or expired status
                else if ($responseBody === 'STATUS_CANCEL' || str_starts_with($responseBody, 'CANCEL_')) {
                    $purchase->status = 'cancelled';
                    $purchase->cancelled_at = now();
                    $purchase->background_monitoring = false; // No longer needs monitoring
                    $purchase->save();
                    
                    // Handle refund logic same as in cancelNumber method
                    $user = $purchase->user;
                    
                    // Get the pending transaction for this order
                    $transaction = \App\Models\WalletTransaction::where('reference_id', $purchase->order_id)
                        ->where('user_id', $user->id)
                        ->where('status', 'pending')
                        ->first();
                    
                    if ($transaction) {
                        // Mark transaction as cancelled
                        $transaction->update([
                            'status' => 'cancelled',
                        ]);
                        
                        // Release the reserved balance
                        $price = abs($transaction->amount);
                        $user->reserved_balance -= $price;
                        $user->save();
                        
                        // Create a refund record
                        \App\Models\WalletTransaction::create([
                            'user_id' => $user->id,
                            'amount' => $price, // Positive amount for refund
                            'transaction_type' => 'refund',
                            'description' => "Refund for cancelled OTP: {$purchase->service_name} (#{$purchase->order_id})",
                            'reference_id' => $purchase->order_id,
                            'status' => 'completed',
                            'metadata' => json_encode([
                                'original_transaction_id' => $transaction->id,
                                'reason' => 'Service cancelled'
                            ]),
                        ]);
                    }
                }
                
            } catch (\Exception $e) {
                Log::error('Background OTP check failed: ' . $e->getMessage(), [
                    'order_id' => $purchase->order_id,
                    'user_id' => $purchase->user_id,
                    'service' => $purchase->service_name,
                ]);
                
                $results['errors']++;
            }
        }
        
        return response()->json([
            'success' => true,
            'results' => $results,
        ]);
    }
} 