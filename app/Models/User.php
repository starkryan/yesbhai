<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'role',
        'wallet_balance',
        'reserved_balance',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'wallet_balance' => 'decimal:2',
            'reserved_balance' => 'decimal:2',
        ];
    }

    /**
     * Check if the user is an admin.
     *
     * @return bool
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Get the wallet transactions for the user.
     */
    public function walletTransactions()
    {
        return $this->hasMany(WalletTransaction::class);
    }

    /**
     * Get the OTP purchases for the user.
     */
    public function otpPurchases()
    {
        return $this->hasMany(OtpPurchase::class);
    }
    
    /**
     * Get the recharges for the user.
     */
    public function recharges()
    {
        return $this->hasMany(Recharge::class);
    }

    /**
     * Check if user has sufficient balance for a purchase.
     *
     * @param float $amount
     * @return bool
     */
    public function hasSufficientBalance(float $amount): bool
    {
        // Consider both actual balance and any reserved amounts
        $availableBalance = $this->wallet_balance - $this->reserved_balance;
        return $availableBalance >= $amount;
    }

    /**
     * Get available balance after deducting reserved amounts.
     *
     * @return float
     */
    public function getAvailableBalanceAttribute(): float
    {
        return (float)$this->wallet_balance - (float)$this->reserved_balance;
    }
}
