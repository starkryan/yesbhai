<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OtpPurchase extends Model
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
        'phone_number',
        'service_name',
        'service_code',
        'server_code',
        'price',
        'verification_code',
        'status',
        'verification_received_at',
        'cancelled_at',
        'expired_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'verification_received_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'expired_at' => 'datetime',
        'price' => 'decimal:2',
    ];

    /**
     * Get the user that owns the OTP purchase.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
