import { usePage } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Menu, Wallet } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { UserMenuContent } from '@/components/user-menu-content';
import React from 'react';

export function HomeHeader() {
  const { auth } = usePage<SharedData>().props;
  const getInitials = useInitials();

  return (
    <header className="w-full border-b bg-background px-4 py-3 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Left side - Logo and Navigation */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/" className="text-xl font-semibold text-primary">
            RealSim
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden gap-6 md:flex">
            <Link href="/" className="text-sm font-medium text-primary">
              Home
            </Link>
            <Link href="/dashboard" className="text-sm font-medium hover:text-primary">
              Dashboard
            </Link>
            <Link href="/about" className="text-sm font-medium hover:text-primary">
              About
            </Link>
            <Link href="/contact" className="text-sm font-medium hover:text-primary">
              Contact
            </Link>
          </nav>
        </div>

        {/* Right side - Phone number, wallet balance, and profile */}
        <div className="flex items-center gap-3">
        

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {auth.user ? (
              <div className="flex items-center gap-4">
                {/* Wallet Balance */}
                <div className="flex items-center gap-1 rounded-lg border bg-accent px-3 py-1.5">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">₹{auth.user.wallet_balance || '0.00'}</span>
                </div>
                
                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="size-10 rounded-full p-1">
                      <Avatar className="size-8 overflow-hidden rounded-full">
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
              </div>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost">
                  <Link href={route('login')}>Login</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={route('register')}>Register</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/">Home</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/about">About</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/contact">Contact</Link>
              </DropdownMenuItem>
              {auth.user && (
                <>
                  <DropdownMenuSeparator />
                  <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
                    <Wallet className="h-4 w-4" />
                    <span>₹{auth.user.wallet_balance || '0.00'}</span>
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem asChild>
                {auth.user ? (
                  <Link href={route('dashboard')}>Dashboard</Link>
                ) : (
                  <Link href={route('login')}>Login</Link>
                )}
              </DropdownMenuItem>
              {!auth.user && (
                <DropdownMenuItem asChild>
                  <Link href={route('register')}>Register</Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
} 