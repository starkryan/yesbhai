<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class UserController extends Controller
{
    /**
     * Display a listing of users.
     */
    public function index()
    {
        $users = User::select('id', 'name', 'email', 'role', 'wallet_balance', 'reserved_balance', 'created_at')
                    ->orderBy('id')
                    ->get();
                    
        return Inertia::render('Admin/Users', [
            'users' => $users
        ]);
    }
    
    /**
     * Update user wallet balance.
     */
    public function updateBalance(Request $request, User $user)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric',
            'type' => 'required|in:add,deduct',
            'description' => 'required|string|max:255',
        ]);
        
        $amount = $validated['amount'];
        $type = $validated['type'];
        $description = $validated['description'];
        
        // Ensure amount is positive
        $amount = abs($amount);
        
        // For deduction, make it negative
        $transactionAmount = ($type === 'add') ? $amount : -$amount;
        
        // Begin transaction to ensure data integrity
        DB::beginTransaction();
        
        try {
            // Update user balance
            if ($type === 'add') {
                $user->wallet_balance += $amount;
            } else {
                // Verify user has enough balance for deduction
                if ($user->wallet_balance < $amount) {
                    return response()->json([
                        'success' => false,
                        'message' => 'User does not have sufficient balance.',
                    ], 400);
                }
                $user->wallet_balance -= $amount;
            }
            
            // Save user with updated balance
            $user->save();
            
            // Create wallet transaction record
            WalletTransaction::create([
                'user_id' => $user->id,
                'amount' => $transactionAmount,
                'status' => 'COMPLETED',
                'transaction_type' => 'adjustment',
                'description' => $description,
                'order_id' => 'ADM' . time() . rand(1000, 9999),
            ]);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Balance updated successfully.',
                'current_balance' => $user->wallet_balance,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update balance: ' . $e->getMessage(),
            ], 500);
        }
    }
}
