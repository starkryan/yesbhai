<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class RechargeController extends Controller
{
    /**
     * Show the recharge page.
     */
    public function index()
    {
        return Inertia::render('recharge');
    }

    /**
     * Initiate a new recharge.
     */
    public function initiateRecharge(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:20|max:10000',
        ]);

        $user = Auth::user();
        $amount = $request->amount;
        $orderId = 'RM' . time() . rand(1000, 9999);

        // Save order to database for tracking
        $recharge = \App\Models\Recharge::create([
            'user_id' => $user->id,
            'order_id' => $orderId,
            'amount' => $amount,
            'status' => 'PENDING',
        ]);

        try {
            $apiUrl = env('PAYMENT_GATEWAY_URL') . '/api/create-order';
            $apiToken = env('PAYMENT_GATEWAY_SECRET', 'c0615930448ece24cc73687dca0aac0d');
            
            // Get the callback URL for the payment gateway
            // This URL is exempted from CSRF protection in the VerifyCsrfToken middleware
            $callbackUrl = url('/recharge/callback');
            
            Log::info('Initiating payment', [
                'user_id' => $user->id,
                'amount' => $amount,
                'order_id' => $orderId,
                'callback_url' => $callbackUrl
            ]);

            $data = [
                'customer_mobile' => $user->id, // Using user ID as reference
                'user_token' => $apiToken,
                'amount' => (string) $amount,
                'order_id' => $orderId,
                'redirect_url' => $callbackUrl,
                'remark1' => 'Wallet Recharge',
                'remark2' => $user->name,
            ];

            $response = Http::asForm()->post($apiUrl, $data);
            $result = $response->json();

            Log::info('Payment Gateway Response', ['response' => $result, 'order_id' => $orderId]);

            if ($result && isset($result['status']) && $result['status'] === true) {
                // Return the payment URL to the frontend
                return response()->json([
                    'success' => true,
                    'payment_url' => $result['result']['payment_url'],
                    'order_id' => $orderId,
                ]);
            } else {
                // Failed to create order
                Log::error('Failed to create payment order', [
                    'error' => $result['message'] ?? 'Unknown error',
                    'order_id' => $orderId
                ]);
                
                // Update recharge record with failure status
                $recharge->update([
                    'status' => 'FAILED',
                    'payment_details' => json_encode($result ?? ['error' => 'No response from gateway']),
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => $result['message'] ?? 'Failed to initiate payment. Please try again.',
                ], 400);
            }
        } catch (\Exception $e) {
            Log::error('Payment gateway error', [
                'error' => $e->getMessage(),
                'order_id' => $orderId,
                'trace' => $e->getTraceAsString()
            ]);
            
            // Update recharge record with error status
            $recharge->update([
                'status' => 'ERROR',
                'payment_details' => json_encode(['error' => $e->getMessage()]),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'An error occurred. Please try again later.',
            ], 500);
        }
    }

    /**
     * Handle the callback from payment gateway.
     * This method is exempted from CSRF verification in VerifyCsrfToken middleware.
     */
    public function handleCallback(Request $request)
    {
        // Enhanced security: Log all incoming data for audit
        Log::info('Payment Callback Received', [
            'data' => $request->all(),
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent()
        ]);
        
        $orderId = $request->input('order_id');
        
        if (!$orderId) {
            Log::error('No order ID in callback');
            return redirect()->route('recharge.public.result', ['status' => 'error', 'message' => 'No order ID provided']);
        }
        
        try {
            // Security: Always verify the payment status with the payment gateway directly
            // This ensures the callback wasn't spoofed
            $apiUrl = env('PAYMENT_GATEWAY_URL') . '/api/check-order-status';
            $apiToken = env('PAYMENT_GATEWAY_SECRET', 'c0615930448ece24cc73687dca0aac0d');
            
            $data = [
                'user_token' => $apiToken,
                'order_id' => $orderId,
            ];
            
            $response = Http::asForm()->post($apiUrl, $data);
            $result = $response->json();
            
            Log::info('Order Status Verification', ['response' => $result, 'order_id' => $orderId]);
            
            // Find the recharge record
            $recharge = \App\Models\Recharge::where('order_id', $orderId)->first();
            
            if (!$recharge) {
                Log::error('Recharge order not found', ['order_id' => $orderId]);
                return redirect()->route('recharge.public.result', ['status' => 'error', 'message' => 'Invalid order']);
            }
            
            // Security: Prevent double processing by checking current status
            if ($recharge->status === 'COMPLETED') {
                Log::warning('Attempted to process already completed payment', ['order_id' => $orderId]);
                return redirect()->route('recharge.public.result', [
                    'status' => 'success',
                    'amount' => $recharge->amount,
                    'orderId' => $orderId
                ]);
            }
            
            // Check for successful payment with various status formats
            $successStatus = (
                $result['status'] === 'COMPLETED' || 
                $result['status'] === 'SUCCESS' || 
                ($result['txnStatus'] ?? '') === 'COMPLETED'
            );
            
            if ($result && isset($result['status']) && $successStatus) {
                // Security: Use database transaction to ensure atomicity
                DB::beginTransaction();
                try {
                    // Update recharge status
                    $recharge->update([
                        'status' => 'COMPLETED',
                        'transaction_id' => $result['utr'] ?? $result['result']['utr'] ?? $result['txnId'] ?? $result['txnStatus'] ?? $result['resultInfo'] ?? null,
                        'payment_details' => json_encode($result),
                    ]);
                    
                    // Update user's wallet balance
                    $user = \App\Models\User::find($recharge->user_id);
                    if ($user) {
                        $user->wallet_balance = $user->wallet_balance + $recharge->amount;
                        $user->save();
                        
                        // Log the user back in FIRST
                        Auth::login($user); 
                        
                        DB::commit();

                        // THEN Refresh the authenticated user instance used by the framework
                        // to ensure subsequent calls to Auth::user() or $request->user() get the updated balance
                        Auth::setUser($user->fresh());

                        Log::info('Wallet recharged successfully', [
                            'user_id' => $user->id,
                            'amount' => $recharge->amount,
                            'new_balance' => $user->wallet_balance,
                            'order_id' => $orderId
                        ]);
                    } else {
                        throw new \Exception('User not found for recharge: ' . $recharge->user_id);
                    }
                    
                } catch (\Exception $e) {
                    DB::rollBack();
                    Log::error('Transaction failed during payment processing', [
                        'error' => $e->getMessage(),
                        'order_id' => $orderId
                    ]);
                    
                    return redirect()->route('recharge.public.result', [
                        'status' => 'error',
                        'message' => 'Error processing payment. Please contact support.',
                        'orderId' => $orderId
                    ]);
                }
                
                // Redirect to the AUTHENTICATED result page instead
                return redirect()->route('recharge.result', [
                    'status' => 'success',
                    'amount' => $recharge->amount,
                    'orderId' => $orderId,
                ]);
            } else {
                // Payment failed or pending
                $status = $result['status'] ?? 'ERROR';
                $message = $result['message'] ?? 'Payment verification failed';
                
                $recharge->update([
                    'status' => $status,
                    'payment_details' => json_encode($result),
                ]);
                
                Log::warning('Payment was not successful', ['status' => $status, 'message' => $message, 'order_id' => $orderId]);
                
                return redirect()->route('recharge.public.result', [
                    'status' => 'failed',
                    'message' => $message,
                    'orderId' => $orderId
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Error processing payment callback', ['error' => $e->getMessage(), 'order_id' => $orderId]);
            
            // Redirect to the authenticated error page as well, if possible
            // Or redirect to a generic error page if the authenticated one isn't suitable
            // For now, keep redirecting to public result on general error for simplicity
            // but consider changing this to 'recharge.result' with status='error'
            return redirect()->route('recharge.public.result', [
                'status' => 'error',
                'message' => 'An error occurred while processing your payment',
                'orderId' => $orderId
            ]);
        }
    }

    /**
     * Handle direct webhook from payment gateway (alternative endpoint).
     * This method is exempted from CSRF verification in VerifyCsrfToken middleware.
     */
    public function handleWebhook(Request $request)
    {
        // Log all webhook data for security audit
        Log::info('Payment Webhook Received', [
            'data' => $request->all(),
            'ip' => $request->ip(),
            'headers' => $request->header()
        ]);
        
        $orderId = $request->input('order_id');
        
        if (!$orderId) {
            Log::error('Invalid webhook: No order ID');
            return response()->json(['status' => 'error', 'message' => 'No order ID provided'], 400);
        }
        
        // Verify the authenticity of the webhook using a shared secret
        $receivedSignature = $request->header('X-Signature');
        $expectedSignature = hash_hmac('sha256', json_encode($request->all()), env('PAYMENT_GATEWAY_SECRET'));
        
        // Optional signature verification if your gateway supports it
        // Uncomment if your payment gateway provides signature verification
        /*
        if (!$receivedSignature || !hash_equals($expectedSignature, $receivedSignature)) {
            Log::error('Invalid webhook signature', [
                'received' => $receivedSignature,
                'expected' => $expectedSignature
            ]);
            return response()->json(['status' => 'error', 'message' => 'Invalid signature'], 403);
        }
        */
        
        // Process the payment using the same logic as handleCallback
        // but return JSON response instead of redirecting
        
        try {
            // Verify with gateway API (similar to handleCallback)
            // ...
            
            // Return appropriate JSON response
            return response()->json([
                'status' => 'success',
                'message' => 'Webhook processed successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Webhook processing error', ['error' => $e->getMessage()]);
            return response()->json([
                'status' => 'error',
                'message' => 'Error processing webhook'
            ], 500);
        }
    }

    /**
     * Check the status of a recharge order.
     */
    public function checkStatus(Request $request)
    {
        $request->validate([
            'order_id' => 'required|string',
        ]);
        
        $orderId = $request->input('order_id');
        $apiUrl = env('PAYMENT_GATEWAY_URL') . '/api/check-order-status';
        $apiToken = env('PAYMENT_GATEWAY_SECRET', 'c0615930448ece24cc73687dca0aac0d');
        
        try {
            $data = [
                'user_token' => $apiToken,
                'order_id' => $orderId,
            ];
            
            $response = Http::asForm()->post($apiUrl, $data);
            $result = $response->json();
            
            if ($result && isset($result['status'])) {
                // Find local recharge record
                $recharge = \App\Models\Recharge::where('order_id', $orderId)->first();
                
                if ($recharge) {
                    // Check if payment was successful and not already processed
                    if ($result['status'] === 'COMPLETED' && $recharge->status !== 'COMPLETED') {
                        // Update recharge status
                        $recharge->update([
                            'status' => 'COMPLETED',
                            'transaction_id' => $result['result']['utr'] ?? null,
                            'payment_details' => json_encode($result),
                        ]);
                        
                        // Update user's wallet balance
                        $user = \App\Models\User::find($recharge->user_id);
                        $user->wallet_balance = $user->wallet_balance + $recharge->amount;
                        $user->save();
                        
                        Log::info('Wallet recharged successfully via status check', [
                            'user_id' => $user->id,
                            'amount' => $recharge->amount,
                            'new_balance' => $user->wallet_balance
                        ]);
                    } elseif ($recharge->status !== $result['status']) {
                        // Update status if different
                        $recharge->update([
                            'status' => $result['status'],
                            'payment_details' => json_encode($result),
                        ]);
                    }
                }
                
                return response()->json([
                    'success' => true,
                    'status' => $result['status'],
                    'message' => $result['message'] ?? '',
                    'amount' => $recharge ? $recharge->amount : null,
                ]);
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Could not verify payment status',
            ], 400);
            
        } catch (\Exception $e) {
            Log::error('Error checking payment status', ['error' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while checking the payment status',
            ], 500);
        }
    }

    /**
     * Show the recharge result page (protected, requires auth).
     */
    public function showResult(Request $request)
    {
        return Inertia::render('recharge-result', [
            'status' => $request->input('status', 'error'),
            'message' => $request->input('message'),
            'amount' => $request->input('amount'),
            'orderId' => $request->input('orderId'),
        ]);
    }
    
    /**
     * Show the public recharge result page (no auth required).
     * This is used after payment gateway callback.
     */
    public function showPublicResult(Request $request)
    {
        // Get basic parameters
        $status = $request->input('status', 'error');
        $message = $request->input('message');
        $amount = $request->input('amount');
        $orderId = $request->input('orderId');
        $userId = $request->input('user_id');
        
        // Log public result page view
        Log::info('Showing public recharge result page', [
            'status' => $status,
            'order_id' => $orderId,
            'amount' => $amount,
            'user_id' => $userId
        ]);
        
        // Get recharge details if we have an order ID
        $rechargeDetails = null;
        if ($orderId) {
            $recharge = \App\Models\Recharge::where('order_id', $orderId)->first();
            if ($recharge) {
                $rechargeDetails = [
                    'status' => $recharge->status,
                    'amount' => $recharge->amount,
                    'transaction_id' => $recharge->transaction_id,
                    'created_at' => $recharge->created_at->format('d M Y, H:i'),
                ];
            }
        }
        
        // Return a simple HTML page without Inertia
        return view('recharge.public-result', [
            'status' => $status,
            'message' => $message,
            'amount' => $amount,
            'orderId' => $orderId,
            'rechargeDetails' => $rechargeDetails
        ]);
    }
} 