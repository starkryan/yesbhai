<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Models\Recharge;
use App\Models\WalletTransaction;

class WalletController extends Controller
{
    /**
     * Show the wallet transactions page.
     */
    public function index()
    {
        return Inertia::render('wallet-transactions');
    }

    /**
     * Get the wallet transactions for the authenticated user.
     */
    public function getTransactions()
    {
        $user = Auth::user();
        
        // Get all wallet transactions from both tables
        $walletTransactions = WalletTransaction::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($transaction) {
                return [
                    'id' => $transaction->id,
                    'order_id' => $transaction->reference_id ?? 'TXN' . $transaction->id,
                    'amount' => $transaction->amount,
                    'status' => $transaction->status,
                    'transaction_type' => $transaction->transaction_type,
                    'description' => $transaction->description,
                    'transaction_id' => null,
                    'created_at' => $transaction->created_at,
                ];
            });
        
        // Get all recharges for the user
        $recharges = Recharge::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($recharge) {
                return [
                    'id' => 'R' . $recharge->id,
                    'order_id' => $recharge->order_id,
                    'amount' => $recharge->amount,
                    'status' => $recharge->status,
                    'transaction_type' => 'recharge',
                    'description' => 'Wallet Recharge',
                    'transaction_id' => $recharge->transaction_id,
                    'created_at' => $recharge->created_at,
                ];
            });
        
        // Combine and sort transactions by created_at
        $allTransactions = $walletTransactions->concat($recharges)
            ->sortByDesc('created_at')
            ->values()
            ->all();
        
        return response()->json([
            'success' => true,
            'transactions' => $allTransactions,
            'wallet_balance' => $user->wallet_balance,
            'available_balance' => $user->available_balance,
            'reserved_balance' => $user->reserved_balance
        ]);
    }
} 