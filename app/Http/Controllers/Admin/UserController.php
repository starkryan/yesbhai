<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Models\OtpPurchase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class UserController extends Controller
{
    /**
     * Display a listing of users.
     */
    public function index(Request $request)
    {
        $search = $request->input('search', '');
        $perPage = (int) $request->input('perPage', 10);
        
        $usersQuery = User::select('id', 'name', 'email', 'role', 'wallet_balance', 'reserved_balance', 'created_at');
        
        // Apply search if provided
        if ($search) {
            $usersQuery->where(function($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('id', 'like', "%{$search}%");
            });
        }
        
        // Paginate the results
        $users = $usersQuery->orderBy('id')->paginate($perPage);
                    
        return Inertia::render('Admin/Users', [
            'users' => $users,
            'filters' => [
                'search' => $search,
                'perPage' => $perPage
            ]
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
                // Verify user has enough balance for deduction, considering reserved balance
                $availableBalance = $user->wallet_balance - $user->reserved_balance;
                if ($availableBalance < $amount) {
                    return response()->json([
                        'success' => false,
                        'message' => 'User does not have sufficient available balance. They have ongoing transactions with reserved funds.',
                        'wallet_balance' => $user->wallet_balance,
                        'reserved_balance' => $user->reserved_balance,
                        'available_balance' => $availableBalance,
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
                'status' => 'completed',
                'transaction_type' => 'adjustment',
                'description' => $description,
                'reference_id' => 'ADM' . time() . rand(1000, 9999),
            ]);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Balance updated successfully.',
                'current_balance' => $user->wallet_balance,
                'available_balance' => $user->wallet_balance - $user->reserved_balance,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update balance: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get user details by ID.
     */
    public function getUserDetails($userId)
    {
        try {
            $user = User::findOrFail($userId);
            return response()->json([
                'success' => true,
                'user' => $user
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch user details: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user's OTP purchases.
     */
    public function getUserPurchases($userId)
    {
        try {
            $user = User::findOrFail($userId);
            $purchases = OtpPurchase::where('user_id', $user->id)
                ->orderBy('created_at', 'desc')
                ->get();
                
            return response()->json([
                'success' => true,
                'purchases' => $purchases
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch user purchases: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user's wallet transactions.
     */
    public function getUserTransactions($userId)
    {
        try {
            $user = User::findOrFail($userId);
            $transactions = WalletTransaction::where('user_id', $user->id)
                ->orderBy('created_at', 'desc')
                ->get();
                
            return response()->json([
                'success' => true,
                'transactions' => $transactions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch user transactions: ' . $e->getMessage()
            ], 500);
        }
    }
}
