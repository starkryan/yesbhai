import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { Wallet, PlusCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from '@inertiajs/react';
export function DashboardHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItem[] }) {
  const { auth } = usePage<SharedData>().props;
  const getInitials = useInitials();
  const [availableBalance, setAvailableBalance] = useState<string>('0.00');

  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        const response = await axios.get('/api/wallet/transactions');
        const balance = parseFloat(response.data.available_balance || response.data.wallet_balance || '0.00');
        setAvailableBalance(balance.toFixed(2));
      } catch (err) {
        // Silent error - don't log to console
        setAvailableBalance('0.00');
      }
    };

    if (auth.user) {
      fetchWalletBalance();
    }
  }, [auth.user]);

  return (
    <header className="border-sidebar-border/50 flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-6">
      {/* Left side: Breadcrumbs */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Breadcrumbs breadcrumbs={breadcrumbs} />
      </div>

      {/* Right side: Wallet balance and profile */}
      <div className="flex items-center gap-2 md:gap-3">
        {auth.user && (
          <div className="flex items-center gap-2 rounded-lg border bg-accent px-2 py-1.5 md:px-3">
            
            <span className="text-xs font-medium md:text-sm">₹{availableBalance}</span>
            <Link href="/recharge" className="text-[10px] font-semibold md:text-xs hover:underline text-red-400">
             <PlusCircle className="h-4 w-4 text-primary" />
            </Link>
          </div>
        )}


        {/* User profile */}
        {auth.user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 md:h-10 md:w-10 md:p-1 rounded-full">
                <Avatar className="h-full w-full overflow-hidden rounded-full">
                  <AvatarImage src={auth.user.avatar} alt={auth.user.name} />
                  <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                    {getInitials(auth.user.name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <UserMenuContent user={auth.user} />
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
} 