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
        Schema::table('otp_purchases', function (Blueprint $table) {
            $table->boolean('background_monitoring')->default(false)->after('expired_at');
            $table->timestamp('last_background_check')->nullable()->after('background_monitoring');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('otp_purchases', function (Blueprint $table) {
            $table->dropColumn('background_monitoring');
            $table->dropColumn('last_background_check');
        });
    }
};
