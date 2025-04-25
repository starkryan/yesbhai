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
     * Check the status of an activation
     */
    public function getStatus(Request $request)
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
                'action' => 'getStatus',
                'id' => $orderId,
            ]);
            
            Log::info('RealOTP getStatus response: ' . $response->body());
            
            $responseBody = $response->body();
            
            // The API might return: STATUS_OK:verification_code
            if (str_starts_with($responseBody, 'STATUS_OK:')) {
                $code = substr($responseBody, strlen('STATUS_OK:'));
                
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
                                'verification_code' => $code,
                                'status' => 'completed',
                                'verification_received_at' => now(),
                            ]);
                            
                            // Get the pending transaction for this order
                            $transaction = \App\Models\WalletTransaction::where('reference_id', $orderId)
                                ->where('user_id', $user->id)
                                ->where('status', 'pending')
                                ->first();
                                
                            if ($transaction) {
                                // Finalize the transaction
                                $transaction->update([
                                    'status' => 'completed',
                                ]);
                                
                                // Now actually deduct from wallet balance
                                $price = abs($transaction->amount);
                                $user->wallet_balance -= $price;
                                $user->reserved_balance -= $price;
                                $user->save();
                            }
                            
                            DB::commit();
                        }
                    } catch (\Exception $e) {
                        DB::rollBack();
                        Log::error('Error processing OTP verification: ' . $e->getMessage());
                    }
                }
                
                return response()->json([
                    'success' => true,
                    'status' => 'completed',
                    'verification_code' => $code,
                    'raw_response' => $responseBody,
                ]);
            }
            
            // STATUS_WAIT means we're still waiting for the code
            if ($responseBody === 'STATUS_WAIT_CODE' || $responseBody === 'STATUS_WAIT') {
                return response()->json([
                    'success' => true,
                    'status' => 'waiting',
                    'raw_response' => $responseBody,
                ]);
            }
            
            // Handle NO_ACTIVATION error explicitly with a clearer message
            if ($responseBody === 'NO_ACTIVATION') {
                // Update the purchase record as expired if it exists
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
                                'status' => 'expired',
                                'expired_at' => now(),
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
                                    'description' => "Refund for expired OTP: {$purchase->service_name} (#{$orderId})",
                                    'reference_id' => $orderId,
                                    'status' => 'completed',
                                    'metadata' => json_encode([
                                        'original_transaction_id' => $transaction->id,
                                        'reason' => 'OTP expired'
                                    ]),
                                ]);
                            }
                            
                            DB::commit();
                        }
                    } catch (\Exception $e) {
                        DB::rollBack();
                        Log::error('Error processing OTP expiration: ' . $e->getMessage());
                    }
                }
                
                return response()->json([
                    'success' => false,
                    'message' => 'No active number found for this order ID. The number might have expired or been cancelled.',
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
            Log::error('RealOTP getStatus error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
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
} 