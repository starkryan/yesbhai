'use client';

import { Head, Link } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Menu } from 'lucide-react';

export default function Navbar() {
  const { auth } = usePage<SharedData>().props;

  return (
    <>
      <Head title="FreeOTP" />
      <header className="w-full border-b bg-background px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* Logo */}
        <Link href="/" className="text-xl font-semibold text-primary">
          FreeOTP
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden gap-6 md:flex">
          <Link href="/" className="text-sm font-medium hover:text-primary">
            Home
          </Link>
          <Link href="/about" className="text-sm font-medium hover:text-primary">
            About
          </Link>
          <Link href="/contact" className="text-sm font-medium hover:text-primary">
            Contact
          </Link>
        </nav>

        {/* Auth Buttons */}
        <div className="hidden items-center gap-3 md:flex">
          {auth.user ? (
            <Button asChild size="sm">
              <Link href={route('dashboard')}>Dashboard</Link>
            </Button>
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
          <DropdownMenuTrigger className="md:hidden" asChild>
            <Button variant="ghost" size="icon">
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
    </header>
    </>
  );
}
