import { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CircleCheck, CircleX, RotateCw, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface RechargeResultProps {
  status: 'success' | 'failed' | 'error' | 'pending';
  message?: string;
  amount?: string;
  orderId?: string;
}

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Home',
    href: '/dashboard',
  },
  {
    title: 'Recharge',
    href: '/recharge',
  },
  {
    title: 'Result',
    href: '#',
  },
];

export default function RechargeResult({ status, message, amount, orderId }: RechargeResultProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [currentMessage, setCurrentMessage] = useState(message);
  
  // Function to check order status
  const checkOrderStatus = async () => {
    if (!orderId) return;
    
    setIsChecking(true);
    try {
      const response = await axios.post('/api/recharge/check-status', { order_id: orderId });
      if (response.data.success) {
        setCurrentStatus(response.data.status === 'COMPLETED' ? 'success' : 'pending');
        setCurrentMessage(response.data.message);
        
        // Reload page if status changed to success
        if (response.data.status === 'COMPLETED' && currentStatus !== 'success') {
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Failed to check order status', error);
    } finally {
      setIsChecking(false);
    }
  };
  
  // Auto check status for pending payments
  useEffect(() => {
    if (currentStatus === 'pending' && orderId) {
      const interval = setInterval(checkOrderStatus, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [currentStatus, orderId]);
  
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Recharge Result" />
      <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Recharge Result</h1>
          <p className="text-sm text-gray-500">
            Payment status for your wallet recharge
          </p>
        </div>
        
        <div className="max-w-md mx-auto w-full">
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-center text-xl">
                {currentStatus === 'success' ? 'Payment Successful' : 
                 currentStatus === 'pending' ? 'Payment Pending' : 
                 'Payment Failed'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center pt-6 pb-4">
              {currentStatus === 'success' ? (
                <div className="flex flex-col items-center text-center">
                  <CircleCheck className="h-20 w-20 text-green-500 mb-4" />
                  <p className="text-lg font-medium mb-1">Your payment was successful!</p>
                  {amount && <p className="text-3xl font-bold mb-3">₹{amount}</p>}
                  <p className="text-gray-500">Your wallet has been recharged.</p>
                  {orderId && <p className="text-xs text-gray-400 mt-3">Order ID: {orderId}</p>}
                </div>
              ) : currentStatus === 'pending' ? (
                <div className="flex flex-col items-center text-center">
                  <RotateCw className="h-20 w-20 text-amber-500 mb-4 animate-spin-slow" />
                  <p className="text-lg font-medium mb-1">Your payment is being processed</p>
                  {amount && <p className="text-3xl font-bold mb-3">₹{amount}</p>}
                  <p className="text-gray-500">Please wait while we confirm your payment.</p>
                  {orderId && <p className="text-xs text-gray-400 mt-3">Order ID: {orderId}</p>}
                  <div className="flex items-center mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={checkOrderStatus}
                      disabled={isChecking}
                      className="flex items-center gap-1"
                    >
                      <RotateCw className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''}`} />
                      Check Status
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  {currentStatus === 'failed' ? (
                    <CircleX className="h-20 w-20 text-red-500 mb-4" />
                  ) : (
                    <AlertCircle className="h-20 w-20 text-amber-500 mb-4" />
                  )}
                  <p className="text-lg font-medium mb-1">
                    {currentStatus === 'failed' ? 'Payment Failed' : 'Error Occurred'}
                  </p>
                  <p className="text-gray-500 max-w-xs mx-auto">
                    {currentMessage || 'We could not process your payment. Please try again.'}
                  </p>
                  {orderId && <p className="text-xs text-gray-400 mt-3">Order ID: {orderId}</p>}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-center gap-3">
              <Button asChild variant="outline">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button asChild>
                <Link href="/recharge">Try Again</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
} 