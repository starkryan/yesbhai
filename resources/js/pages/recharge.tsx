import { useState, FormEvent, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, CreditCard, Wallet, History } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import axios from 'axios';

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Home',
    href: '/dashboard',
  },
  {
    title: 'Recharge',
    href: '/recharge',
  },
];

export default function Recharge() {
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


 

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 1) {
      setError('Amount must be at least ₹1');
      return;
    }
    
    if (parsedAmount > 10000) {
      setError('Maximum recharge amount is ₹10,000');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Send request to server
      const response = await axios.post('/api/recharge/initiate', { amount: parsedAmount });
      
      if (response.data.success && response.data.payment_url) {
        // Redirect to payment gateway
        window.location.href = response.data.payment_url;
      } else {
        setError('Failed to initiate payment. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const predefinedAmounts = [100, 200, 500, 1000];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Recharge Wallet" />
      <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Recharge</h1>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Add funds to your wallet to use for OTP services
            </p>
           
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            
            <CardHeader>
              <CardTitle>Add Funds</CardTitle>
              <CardDescription>
                Enter an amount to add to your wallet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                    max="10000"
                    required
                  />
                  <div className="flex flex-wrap gap-2 pt-2">
                    {predefinedAmounts.map((preAmount) => (
                      <Button 
                        key={preAmount} 
                        type="button" 
                        variant="outline" 
                        onClick={() => setAmount(preAmount.toString())}
                        className="flex-1"
                      >
                        ₹{preAmount}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !amount}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" /> Proceed to Payment
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col items-start text-xs ">
              <p>• Minimum recharge amount: ₹1</p>
              <p>• Maximum recharge amount: ₹10,000</p>
              <p>• Payment will be processed securely</p>
              <div className="w-full flex justify-end mt-2">
                <Link 
                  href="/wallet-transactions" 
                  className="text-primary hover:underline flex items-center gap-1 text-xs"
                >
                  <History className="h-3 w-3" />
                  View Transaction History
                </Link>
              </div>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
              <CardDescription>
                How it works
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <CreditCard className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Secure Payment</h4>
                    <p className="text-sm text-gray-500">Your payment information is encrypted and secure</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <Wallet className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Instant Wallet Update</h4>
                    <p className="text-sm text-gray-500">Your wallet balance will be updated immediately after successful payment</p>
                  </div>
                </div>
              </div>
              
              <Alert>
                <AlertTitle>Payment Methods</AlertTitle>
                <AlertDescription>
                  We accept UPI payments through our secure payment gateway.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
} 