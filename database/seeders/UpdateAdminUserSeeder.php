<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;

class UpdateAdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Update the specific user to be an admin
        User::where('email', 'rohitsiitpatna@gmail.com')
            ->update(['role' => 'admin']);
        
        $this->command->info('User rohitsiitpatna@gmail.com has been set as admin');
    }
}
