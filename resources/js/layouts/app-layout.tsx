import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Wallet, CreditCard, Settings } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { type SharedData, type Auth } from '@/types';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default ({ children, breadcrumbs, ...props }: AppLayoutProps) => (
    <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
        {children}
    </AppLayoutTemplate>
);

// In the sidebar navigation section, add admin links for admin users
const NavLinks = () => {
  const props = usePage().props as any;
  const user = props.auth?.user;
  const isAdmin = user?.role === 'admin';

  return (
    <div className="flex flex-col gap-1">
      <Link
        href={route('dashboard')}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50',
          route().current('dashboard') && 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50'
        )}
      >
        <LayoutDashboard className="h-4 w-4" />
        <span>Dashboard</span>
      </Link>
      
      <Link
        href={route('wallet.transactions')}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50',
          route().current('wallet.transactions') && 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50'
        )}
      >
        <Wallet className="h-4 w-4" />
        <span>Wallet</span>
      </Link>
      
      <Link
        href={route('recharge')}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50',
          route().current('recharge') && 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50'
        )}
      >
        <CreditCard className="h-4 w-4" />
        <span>Recharge</span>
      </Link>
      
      <Separator className="my-2" />
      
      <Link
        href={route('settings.profile')}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50',
          route().current('settings.profile') && 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50'
        )}
      >
        <Settings className="h-4 w-4" />
        <span>Settings</span>
      </Link>
      
      {isAdmin && (
        <>
          <Separator className="my-2" />
          <p className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">Admin</p>
          
          <Link
            href={route('admin.users')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50',
              route().current('admin.users') && 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50'
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Manage Users</span>
          </Link>
        </>
      )}
    </div>
  );
};
