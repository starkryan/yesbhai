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
        Schema::table('users', function (Blueprint $table) {
            // Add reserved_balance column if it doesn't exist
            if (!Schema::hasColumn('users', 'reserved_balance')) {
                $table->decimal('reserved_balance', 10, 2)->default(0.00)->after('wallet_balance');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('reserved_balance');
        });
    }
};
