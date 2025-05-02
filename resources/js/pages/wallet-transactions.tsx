import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import axios from 'axios';
import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Wallet, Clock, WalletCards } from 'lucide-react';

interface Transaction {
  id: number | string;
  order_id: string;
  amount: string;
  status: string;
  transaction_type: string;
  description: string;
  transaction_id: string | null;
  created_at: string;
}

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Home',
    href: '/dashboard',
  },
  {
    title: 'Wallet',
    href: '/wallet-transactions',
  },
];

export default function WalletTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string>('0.00');
  const [availableBalance, setAvailableBalance] = useState<string>('0.00');
  const [reservedBalance, setReservedBalance] = useState<string>('0.00');

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get('/api/wallet/transactions');
        setTransactions(response.data.transactions);
        setWalletBalance(response.data.wallet_balance || '0.00');
        setAvailableBalance(response.data.available_balance || response.data.wallet_balance || '0.00');
        setReservedBalance(response.data.reserved_balance || '0.00');
        setError(null);
      } catch (err) {
        setError('Failed to load transaction history. Please try again.');
        console.error('Error fetching transactions:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return new Date(dateString).toLocaleDateString('en-IN', options);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return <Badge variant="default" className="bg-green-500">Successful</Badge>;
      case 'PENDING':
        return <Badge variant="outline">Pending</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTransactionTypeBadge = (type: string, amount: string) => {
    const isDebit = parseFloat(amount) < 0;
    
    switch (type) {
      case 'recharge':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Recharge</Badge>;
      case 'purchase':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Purchase</Badge>;
      case 'refund':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Refund</Badge>;
      case 'adjustment':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Adjustment</Badge>;
      default:
        return isDebit 
          ? <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Debit</Badge>
          : <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Credit</Badge>;
    }
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Wallet Transactions" />
      <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Wallet Transactions</h1>
          <p className="text-sm text-gray-500">
            View your wallet recharge history
          </p>
        </div>
        
        {/* Wallet Balance Card */}
        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Available Balance</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">₹{(parseFloat(availableBalance) || 0).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Available to spend</p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/recharge">Recharge Wallet</Link>
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Reserved Amount</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">₹{(parseFloat(reservedBalance) || 0).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Reserved for pending OTPs</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Total Balance</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <WalletCards className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">₹{(parseFloat(walletBalance) || 0).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Total wallet balance</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              All your wallet recharges and transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">{error}</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No transactions found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className={`font-medium ${parseFloat(transaction.amount) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ₹{parseFloat(transaction.amount) < 0 
                              ? Math.abs(parseFloat(transaction.amount)).toFixed(2) 
                              : parseFloat(transaction.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>{getTransactionTypeBadge(transaction.transaction_type, transaction.amount)}</TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                        <TableCell className="font-mono text-xs">{transaction.order_id}</TableCell>
                        <TableCell>{formatDate(transaction.created_at)}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
} 