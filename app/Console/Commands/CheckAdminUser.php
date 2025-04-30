<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class CheckAdminUser extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'admin:check {email?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check if a user is an admin or list all admin users';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');
        
        if ($email) {
            $user = User::where('email', $email)->first();
            
            if (!$user) {
                $this->error("User with email '{$email}' not found.");
                return 1;
            }
            
            $this->info("User: {$user->name} ({$user->email})");
            $this->info("Role: {$user->role}");
            $this->info("Admin: " . ($user->isAdmin() ? 'Yes' : 'No'));
            
            return 0;
        }
        
        // List all admin users
        $admins = User::where('role', 'admin')->get();
        
        if ($admins->isEmpty()) {
            $this->warn('No admin users found in the system.');
            return 1;
        }
        
        $this->info('Admin users:');
        $this->table(
            ['ID', 'Name', 'Email', 'Role'],
            $admins->map(fn($admin) => [
                'id' => $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
                'role' => $admin->role,
            ])
        );
        
        return 0;
    }
}
