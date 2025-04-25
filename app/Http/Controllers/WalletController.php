<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

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
        
        // Get all recharges for the user, ordered by most recent first
        $transactions = \App\Models\Recharge::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get([
                'id',
                'order_id',
                'amount',
                'status',
                'transaction_id',
                'created_at'
            ]);
        
        return response()->json([
            'success' => true,
            'transactions' => $transactions,
            'wallet_balance' => $user->wallet_balance
        ]);
    }
} 