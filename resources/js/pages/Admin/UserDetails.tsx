import { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import { router } from '@inertiajs/react';
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
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, User, Wallet, CreditCard, ShoppingCart, RefreshCw, TimerReset, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserDetails {
  id: number;
  name: string;
  email: string;
  role: string;
  wallet_balance: string;
  reserved_balance: string;
  created_at: string;
  updated_at: string;
}

interface OtpPurchase {
  id: number;
  order_id: string;
  phone_number: string;
  service_name: string;
  price: string;
  status: string;
  verification_code: string | null;
  created_at: string;
  verification_received_at: string | null;
  cancelled_at: string | null;
}

interface Transaction {
  id: number;
  amount: string;
  transaction_type: string;
  description: string;
  status: string;
  reference_id: string | null;
  created_at: string;
}

interface UserStats {
  total_spent: number;
  total_recharged: number;
  total_refunded: number;
  total_purchases: number;
  completed_purchases: number;
  cancelled_purchases: number;
  waiting_purchases: number;
  purchase_success_rate: number;
  most_used_service: string;
  average_purchase_price: number;
  first_purchase_date: string | null;
  last_purchase_date: string | null;
}

interface UserDetailsProps {
  userId: number;
}

export default function UserDetails({ userId }: UserDetailsProps) {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [otpPurchases, setOtpPurchases] = useState<OtpPurchase[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Home', href: '/dashboard' },
    { title: 'Admin', href: '/admin' },
    { title: 'Users', href: '/admin/users' },
    { title: user?.name || 'User Details', href: `/admin/users/${userId}` },
  ];

  useEffect(() => {
    const fetchUserDetails = async () => {
      setIsLoading(true);
      try {
        // Fetch user details
        const userResponse = await axios.get(`/api/admin/users/${userId}`);
        setUser(userResponse.data.user);

        // Fetch OTP purchases
        const purchasesResponse = await axios.get(`/api/admin/users/${userId}/purchases`);
        setOtpPurchases(purchasesResponse.data.purchases);

        // Fetch transactions
        const transactionsResponse = await axios.get(`/api/admin/users/${userId}/transactions`);
        setTransactions(transactionsResponse.data.transactions);

        // Calculate statistics
        if (purchasesResponse.data.purchases.length > 0) {
          calculateStats(
            userResponse.data.user,
            purchasesResponse.data.purchases,
            transactionsResponse.data.transactions
          );
        }

        setError(null);
      } catch (err) {
        setError('Failed to load user details. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserDetails();
  }, [userId]);

  const calculateStats = (
    user: UserDetails,
    purchases: OtpPurchase[],
    transactions: Transaction[]
  ) => {
    // Calculate purchase statistics
    const totalPurchases = purchases.length;
    const completedPurchases = purchases.filter(p => p.status === 'completed').length;
    const cancelledPurchases = purchases.filter(p => p.status === 'cancelled').length;
    const waitingPurchases = purchases.filter(p => p.status === 'waiting').length;
    
    // Calculate financial statistics
    const totalSpent = transactions
      .filter(t => t.transaction_type === 'purchase' && t.status === 'completed')
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
    
    const totalRecharged = transactions
      .filter(t => t.transaction_type === 'recharge' && t.status === 'completed')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const totalRefunded = transactions
      .filter(t => t.transaction_type === 'refund' && t.status === 'completed')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    // Find most used service
    const serviceCount: Record<string, number> = {};
    purchases.forEach(p => {
      if (!serviceCount[p.service_name]) {
        serviceCount[p.service_name] = 0;
      }
      serviceCount[p.service_name]++;
    });
    
    let mostUsedService = 'None';
    let maxCount = 0;
    Object.entries(serviceCount).forEach(([service, count]) => {
      if (count > maxCount) {
        mostUsedService = service;
        maxCount = count;
      }
    });
    
    // Calculate average purchase price
    const averagePurchasePrice = totalPurchases > 0
      ? purchases.reduce((sum, p) => sum + parseFloat(p.price || '0'), 0) / totalPurchases
      : 0;
    
    // Get first and last purchase dates
    const purchaseDates = purchases
      .map(p => new Date(p.created_at).getTime())
      .sort((a, b) => a - b);
    
    const firstPurchaseDate = purchaseDates.length > 0
      ? new Date(purchaseDates[0]).toISOString()
      : null;
    
    const lastPurchaseDate = purchaseDates.length > 0
      ? new Date(purchaseDates[purchaseDates.length - 1]).toISOString()
      : null;
    
    setStats({
      total_spent: totalSpent,
      total_recharged: totalRecharged,
      total_refunded: totalRefunded,
      total_purchases: totalPurchases,
      completed_purchases: completedPurchases,
      cancelled_purchases: cancelledPurchases,
      waiting_purchases: waitingPurchases,
      purchase_success_rate: totalPurchases > 0 ? (completedPurchases / totalPurchases) * 100 : 0,
      most_used_service: mostUsedService,
      average_purchase_price: averagePurchasePrice,
      first_purchase_date: firstPurchaseDate,
      last_purchase_date: lastPurchaseDate,
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    
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
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'waiting':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">Waiting</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
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

  if (isLoading) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <Head title="Admin - User Details" />
        <div className="flex h-full flex-1 flex-col gap-6 p-4">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !user) {
    return (
      <AppLayout breadcrumbs={breadcrumbs}>
        <Head title="Admin - User Details" />
        <div className="flex h-full flex-1 flex-col gap-6 p-4">
          <div className="flex flex-col items-center justify-center h-64">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Error Loading User Details</h2>
            <p className="text-gray-500 mb-4">{error || 'User not found'}</p>
            <Button asChild>
              <Link href="/admin/users">Back to Users List</Link>
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`Admin - ${user.name}'s Details`} />
      <div className="flex h-full flex-1 flex-col gap-6 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Button variant="outline" size="sm" asChild className="mb-2">
              <Link href="/admin/users">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Users
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">{user.name}'s Account</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
        </div>

        {/* User Profile Overview Card */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-xl">Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <User className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-xl font-bold">{user.name}</h2>
                <p className="text-gray-500 mb-2">{user.email}</p>
                <Badge className={user.role === 'admin' ? 'bg-purple-500' : ''}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
                <div className="mt-4 w-full">
                  <p className="text-sm text-gray-500">Member since</p>
                  <p className="font-medium">{formatDate(user.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wallet Overview Card */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle className="text-xl">Wallet Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Wallet className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Balance</p>
                    <p className="text-2xl font-bold">₹{parseFloat(user.wallet_balance).toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                    <CreditCard className="h-7 w-7 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Available Balance</p>
                    <p className="text-2xl font-bold">₹{(parseFloat(user.wallet_balance) - parseFloat(user.reserved_balance)).toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100">
                    <Clock className="h-7 w-7 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reserved Amount</p>
                    <p className="text-2xl font-bold">₹{parseFloat(user.reserved_balance).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {stats && (
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Total Recharged</p>
                    <p className="text-xl font-bold text-green-600">₹{stats.total_recharged.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Total Spent</p>
                    <p className="text-xl font-bold text-red-600">₹{stats.total_spent.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Total Refunded</p>
                    <p className="text-xl font-bold text-purple-600">₹{stats.total_refunded.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Avg. Purchase</p>
                    <p className="text-xl font-bold">₹{stats.average_purchase_price.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* OTP Purchases Statistics */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">OTP Purchase Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="flex flex-col items-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
                    <ShoppingCart className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-3xl font-bold mb-1">{stats.total_purchases}</h3>
                  <p className="text-gray-500">Total OTP Purchases</p>
                </div>
                
                <div className="flex flex-col items-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-3xl font-bold">{stats.completed_purchases}</h3>
                    <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      {stats.purchase_success_rate.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-gray-500">Successful Purchases</p>
                </div>
                
                <div className="flex flex-col items-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-3xl font-bold mb-1">{stats.cancelled_purchases}</h3>
                  <p className="text-gray-500">Cancelled Purchases</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Most Used Service</p>
                  <p className="text-lg font-bold">{stats.most_used_service}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Waiting for OTPs</p>
                  <p className="text-lg font-bold">{stats.waiting_purchases}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">First Purchase</p>
                  <p className="text-lg font-bold">{formatDate(stats.first_purchase_date)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Last Purchase</p>
                  <p className="text-lg font-bold">{formatDate(stats.last_purchase_date)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transactions and OTP Purchases Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Transactions</TabsTrigger>
                <TabsTrigger value="otp">OTP Purchases</TabsTrigger>
                <TabsTrigger value="recharge">Recharges</TabsTrigger>
                <TabsTrigger value="refund">Refunds</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No transactions found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>{transaction.id}</TableCell>
                            <TableCell className={`font-medium ${parseFloat(transaction.amount) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              ₹{parseFloat(transaction.amount) < 0 
                                  ? Math.abs(parseFloat(transaction.amount)).toFixed(2) 
                                  : parseFloat(transaction.amount).toFixed(2)}
                            </TableCell>
                            <TableCell>{getTransactionTypeBadge(transaction.transaction_type, transaction.amount)}</TableCell>
                            <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                            <TableCell className="font-mono text-xs">{transaction.reference_id || '-'}</TableCell>
                            <TableCell>{formatDate(transaction.created_at)}</TableCell>
                            <TableCell>{transaction.description}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="otp">
                {otpPurchases.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No OTP purchases found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Phone Number</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Verification Code</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {otpPurchases.map((purchase) => (
                          <TableRow key={purchase.id}>
                            <TableCell className="font-mono text-xs">{purchase.order_id}</TableCell>
                            <TableCell>{purchase.service_name}</TableCell>
                            <TableCell className="font-mono text-xs">{purchase.phone_number}</TableCell>
                            <TableCell>₹{parseFloat(purchase.price).toFixed(2)}</TableCell>
                            <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                            <TableCell>{formatDate(purchase.created_at)}</TableCell>
                            <TableCell className="font-mono text-xs">{purchase.verification_code || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="recharge">
                {transactions.filter(t => t.transaction_type === 'recharge').length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No recharges found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions
                          .filter(t => t.transaction_type === 'recharge')
                          .map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell>{transaction.id}</TableCell>
                              <TableCell className="font-medium text-green-600">
                                ₹{parseFloat(transaction.amount).toFixed(2)}
                              </TableCell>
                              <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                              <TableCell className="font-mono text-xs">{transaction.reference_id || '-'}</TableCell>
                              <TableCell>{formatDate(transaction.created_at)}</TableCell>
                              <TableCell>{transaction.description}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="refund">
                {transactions.filter(t => t.transaction_type === 'refund').length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No refunds found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions
                          .filter(t => t.transaction_type === 'refund')
                          .map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell>{transaction.id}</TableCell>
                              <TableCell className="font-medium text-purple-600">
                                ₹{parseFloat(transaction.amount).toFixed(2)}
                              </TableCell>
                              <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                              <TableCell className="font-mono text-xs">{transaction.reference_id || '-'}</TableCell>
                              <TableCell>{formatDate(transaction.created_at)}</TableCell>
                              <TableCell>{transaction.description}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
} 