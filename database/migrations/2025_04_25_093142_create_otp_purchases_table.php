<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('otp_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('order_id')->unique();
            $table->string('phone_number');
            $table->string('service_name');
            $table->string('service_code');
            $table->string('server_code');
            $table->decimal('price', 10, 2)->nullable();
            $table->string('verification_code')->nullable();
            $table->enum('status', ['waiting', 'completed', 'cancelled', 'expired'])->default('waiting');
            $table->timestamp('verification_received_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('expired_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('otp_purchases');
    }
};
