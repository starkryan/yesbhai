<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use App\Models\Recharge;
use App\Models\User;
use Exception;

class PaymentService
{
    /**
     * Verify a callback/webhook request is legitimate.
     *
     * @param array $data The request data
     * @param string $signature The signature from the request header
     * @param string $ip The IP address of the sender
     * @return bool
     */
    public function verifyWebhook(array $data, ?string $signature, string $ip): bool
    {
        // Verify IP if enabled
        if (Config::get('payment.verify_ip', false)) {
            $allowedIps = Config::get('payment.allowed_ips', []);
            if (!empty($allowedIps) && !in_array($ip, $allowedIps)) {
                Log::warning('Payment webhook from unauthorized IP', ['ip' => $ip]);
                return false;
            }
        }
        
        // Verify signature if enabled
        if (Config::get('payment.verify_signature', false) && $signature) {
            $secret = Config::get('payment.gateways.apnabestupi.secret');
            $expectedSignature = hash_hmac('sha256', json_encode($data), $secret);
            
            if (!hash_equals($expectedSignature, $signature)) {
                Log::warning('Invalid payment webhook signature', [
                    'expected' => $expectedSignature,
                    'received' => $signature
                ]);
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Verify payment status with the payment gateway
     *
     * @param string $orderId The order ID to verify
     * @return array The response from the payment gateway
     * @throws Exception If the request fails
     */
    public function verifyPaymentStatus(string $orderId): array
    {
        $apiUrl = Config::get('payment.gateways.apnabestupi.url') . '/api/check-order-status';
        $apiToken = Config::get('payment.gateways.apnabestupi.secret');
        
        $data = [
            'user_token' => $apiToken,
            'order_id' => $orderId,
        ];
        
        $response = Http::asForm()->post($apiUrl, $data);
        
        if (!$response->successful()) {
            throw new Exception('Failed to verify payment status with gateway');
        }
        
        return $response->json();
    }
    
    /**
     * Process a successful payment
     *
     * @param Recharge $recharge The recharge record
     * @param array $paymentData Payment data from the gateway
     * @return bool Success status
     * @throws Exception If processing fails
     */
    public function processSuccessfulPayment(Recharge $recharge, array $paymentData): bool
    {
        // Use a transaction to ensure data integrity
        \DB::beginTransaction();
        
        try {
            // Update recharge record
            $recharge->update([
                'status' => 'COMPLETED',
                'transaction_id' => $this->extractTransactionId($paymentData),
                'payment_details' => json_encode($paymentData),
            ]);
            
            // Update user wallet
            $user = User::findOrFail($recharge->user_id);
            $user->wallet_balance = $user->wallet_balance + $recharge->amount;
            $user->save();
            
            \DB::commit();
            
            Log::info('Payment processed successfully', [
                'order_id' => $recharge->order_id,
                'user_id' => $user->id,
                'amount' => $recharge->amount,
                'new_balance' => $user->wallet_balance
            ]);
            
            return true;
        } catch (Exception $e) {
            \DB::rollBack();
            
            Log::error('Failed to process payment', [
                'error' => $e->getMessage(),
                'order_id' => $recharge->order_id
            ]);
            
            throw $e;
        }
    }
    
    /**
     * Extract transaction ID from various payment gateway response formats
     * 
     * @param array $paymentData The payment data
     * @return string|null The transaction ID
     */
    private function extractTransactionId(array $paymentData): ?string
    {
        return $paymentData['utr'] 
            ?? $paymentData['result']['utr'] 
            ?? $paymentData['txnId'] 
            ?? $paymentData['txnStatus'] 
            ?? $paymentData['resultInfo'] 
            ?? null;
    }
    
    /**
     * Determine if a payment status indicates success
     * 
     * @param array $paymentData The payment data
     * @return bool Whether the payment was successful
     */
    public function isSuccessfulPayment(array $paymentData): bool
    {
        return isset($paymentData['status']) && (
            $paymentData['status'] === 'COMPLETED' ||
            $paymentData['status'] === 'SUCCESS' ||
            ($paymentData['txnStatus'] ?? '') === 'COMPLETED'
        );
    }
} 