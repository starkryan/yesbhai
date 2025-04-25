<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Recharge extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'order_id',
        'amount',
        'status',
        'transaction_id',
        'payment_details',
    ];

    /**
     * Get the user that owns the recharge.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
} 