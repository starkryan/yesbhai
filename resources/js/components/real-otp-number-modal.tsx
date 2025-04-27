import { useState, useEffect } from 'react';
import { useRealOtpNumber } from '@/hooks/useRealOtpNumber';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, CheckCircle, AlertCircle, RefreshCw, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface RealOtpNumberModalProps {
  open: boolean;
  onClose: () => void;
  serviceCode: string;
  serverCode: string;
  serviceName: string;
  existingOrderId?: string;
}

export function RealOtpNumberModal({
  open,
  onClose,
  serviceCode,
  serverCode,
  serviceName,
  existingOrderId,
}: RealOtpNumberModalProps) {
  const {
    isLoading,
    error,
    phoneNumber,
    orderId,
    verificationCode,
    status,
    requestNumber,
    checkStatus,
    cancelNumber,
    reset,
    retryCount,
    MAX_RETRIES,
    persistState,
    loadPersistedState
  } = useRealOtpNumber();
  
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [remainingTime, setRemainingTime] = useState(300); // 5 minutes in seconds
  const [copied, setCopied] = useState<'phone' | 'code' | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [insufficientBalance, setInsufficientBalance] = useState<{current: string, required: string} | null>(null);
  
  // Try to load existing persisted state for this service
  useEffect(() => {
    if (open && existingOrderId) {
      // First try to load any persisted state for this order
      loadPersistedState(existingOrderId);
      // Then check for status update from the server
      checkStatus(existingOrderId);
    }
  }, [open, existingOrderId]);
  
  // Request the number when modal opens
  useEffect(() => {
    if (open) {
      if (existingOrderId) {
        // If an existing order ID is provided, just check its status instead of requesting a new number
        checkStatus(existingOrderId);
      } else if (status === 'idle') {
        // Otherwise request a new number
        requestNumber({ 
          service_code: serviceCode, 
          server_code: serverCode,
          service_name: serviceName
        }).then(result => {
          if (!result.success && result.error?.includes('Insufficient wallet balance')) {
            try {
              // Try to extract the balance details from error message
              const errorData = JSON.parse(result.error);
              if (errorData && typeof errorData === 'object') {
                setInsufficientBalance({
                  current: typeof errorData.current_balance === 'number' 
                    ? errorData.current_balance.toFixed(2) 
                    : (errorData.current_balance || '0.00'),
                  required: typeof errorData.required_price === 'string' 
                    ? errorData.required_price 
                    : (errorData.required_price?.toString() || '0.00')
                });
              }
            } catch (e) {
              // do nothing
            }
          }
        });
      }
    }
    
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [open, serviceCode, serverCode, serviceName, existingOrderId]);
  
  // Set up timer for checking status and countdown
  useEffect(() => {
    if (status === 'waiting' && (orderId || existingOrderId)) {
      // Start status check interval
      const interval = setInterval(() => {
        const orderToCheck = orderId || existingOrderId;
        if (orderToCheck) {
          checkStatus(orderToCheck).catch(() => {
            // If there's an error during status check, we'll handle it in the hook
            setIsRetrying(retryCount > 0 && retryCount <= MAX_RETRIES);
          });
        }
      }, 5000); // Check every 5 seconds
      
      setCheckInterval(interval);
      
      // Start countdown timer
      const countdownInterval = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => {
        clearInterval(interval);
        clearInterval(countdownInterval);
      };
    }
    
    // If we get a verification code, stop checking
    if (status === 'completed' && checkInterval) {
      clearInterval(checkInterval);
      
      // Show notification when verification code is received
      if (verificationCode && !open) {
        toast.success(`OTP Code Received: ${verificationCode}`, {
          description: `For service: ${serviceName}`,
          duration: 10000,
          action: {
            label: "Copy",
            onClick: () => navigator.clipboard.writeText(verificationCode)
          }
        });
      }
    }
  }, [status, orderId, existingOrderId, verificationCode, open, serviceName]);
  
  // Format time as minutes:seconds
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Copy text to clipboard
  const copyToClipboard = (text: string, type: 'phone' | 'code') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };
  
  // Handle closing - now with option to keep monitoring in background
  const handleClose = () => {
    // Stop UI update intervals but don't reset state
    if (checkInterval) {
      clearInterval(checkInterval);
      setCheckInterval(null);
    }
    
    // Persist current state so it can be resumed
    if (orderId && status === 'waiting') {
      persistState(orderId, {
        phoneNumber,
        serviceCode,
        serverCode,
        serviceName
      });
      
      toast.info("OTP Request Active", {
        description: "We'll continue monitoring your OTP in the background.",
        duration: 5000,
      });
      
      // Set up background monitoring through server-side checking
      const orderToCheck = orderId || existingOrderId;
      if (orderToCheck) {
        // Register background check with the server
        fetch(`/api/realotp/register-background-check?order_id=${orderToCheck}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        }).catch(() => {
          // Ignore errors in background registration
        });
      }
    } else {
      // Reset state if not actively waiting
      reset();
    }
    
    onClose();
  };
  
  // Handle retrying
  const handleRetry = () => {
    if (checkInterval) {
      clearInterval(checkInterval);
    }
    setRemainingTime(300);
    reset();
    requestNumber({ 
      service_code: serviceCode, 
      server_code: serverCode,
      service_name: serviceName 
    });
  };
  
  // If we've waited too long for SMS, show timeout error
  useEffect(() => {
    if (remainingTime === 0 && status === 'waiting') {
      // Manually set error message for timeout
      setCheckInterval(null);
    }
  }, [remainingTime, status]);
  
  // Handle cancelling
  const handleCancel = async () => {
    const orderToCancel = orderId || existingOrderId;
    if (orderToCancel) {
      if (checkInterval) {
        clearInterval(checkInterval);
        setCheckInterval(null);
      }
      await cancelNumber(orderToCancel);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {status === 'completed' ? 'Verification Code Received' :
             status === 'cancelled' ? 'Number Cancelled' :
             status === 'waiting' ? (isRetrying ? 'Reconnecting...' : 'Waiting for SMS Code') :
             status === 'failed' ? 'Request Failed' :
             'Requesting Phone Number'}
          </DialogTitle>
          <DialogDescription>
            Service: {serviceName} (Server {serverCode})
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {isLoading && status === 'requesting' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
              <p>Requesting phone number...</p>
            </div>
          )}
          
          {isRetrying && !error && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-start">
              <RefreshCw className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 animate-spin" />
              <div>
                <p className="font-medium">Reconnecting to service</p>
                <p className="text-sm mt-1">
                  Connection to OTP service is slow. Retrying...
                  (Attempt {retryCount} of {MAX_RETRIES})
                </p>
              </div>
            </div>
          )}
          
          {error && !error.includes('Insufficient wallet balance') && (
            <div className="bg-background border rounded-md p-4 flex items-start">
              <AlertCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Request failed</p>
                <p className="text-sm mt-1">
                  {error.includes('cURL error 28') 
                    ? 'Connection to OTP service timed out. Please try again or try a different service.' 
                    : error}
                </p>
                {status === 'waiting' && remainingTime === 0 && (
                  <p className="text-sm mt-2">
                    The SMS verification code didn't arrive within the expected time. 
                    You can try requesting a new number.
                  </p>
                )}
              </div>
            </div>
          )}
          
          {!error && remainingTime === 0 && status === 'waiting' && (
            <div className="bg-background border rounded-md p-4 flex items-start">
              <Clock className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Time expired</p>
                <p className="text-sm mt-1">
                  The SMS verification code didn't arrive within the expected time.
                  The service might be busy or the number may no longer be active.
                  You can try requesting a new number.
                </p>
              </div>
            </div>
          )}
          
          {status === 'cancelled' && (
            <div className="bg-background border rounded-md p-4 flex items-start">
              <XCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Number Cancelled</p>
                <p className="text-sm mt-1">
                  You have successfully cancelled this phone number.
                </p>
              </div>
            </div>
          )}
          
          {error && error.includes('Insufficient wallet balance') && (
            <div className="rounded-md p-4 flex items-start bg-red-50 border border-red-200">
              <AlertCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" />
              <div>
                <p className="font-medium text-red-700">Insufficient Balance</p>
                <p className="text-sm mt-1 text-red-600">
                  You don't have enough balance to purchase this number.
                  {insufficientBalance && (
                    <>
                      <br />
                      Available Balance: ₹{parseFloat(insufficientBalance.current).toFixed(2)}
                      <br />
                      Required Amount: ₹{parseFloat(insufficientBalance.required).toFixed(2)}
                    </>
                  )}
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="mt-3 border-red-200 hover:bg-red-100 hover:text-red-700"
                  asChild
                >
                  <a href="/recharge">Recharge Wallet</a>
                </Button>
              </div>
            </div>
          )}
          
          {phoneNumber && (
            <div className="space-y-4">
              <div className="bg-background border rounded-md p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">Phone Number</p>
                    <p className="text-xl font-bold mt-1">{phoneNumber}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(phoneNumber, 'phone')}
                    className="h-8"
                  >
                    {copied === 'phone' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              {status === 'waiting' && remainingTime > 0 && (
                <div className="bg-background border rounded-md p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Waiting for SMS</p>
                      <p className="text-sm mt-1">
                       Waiting for SMS
                      </p>
                    </div>
                    <div className="font-medium">
                      {formatTime(remainingTime)}
                    </div>
                  </div>
                  <div className="mt-3 w-full bg-secondary rounded-full h-1.5">
                    <div 
                      className="bg-primary h-1.5 rounded-full" 
                      style={{ width: `${(remainingTime / 300) * 100}%` }}
                    ></div>
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    You can close this modal and we'll continue checking for your code in the background.
                  </div>
                </div>
              )}
              
              {status === 'completed' && verificationCode && (
                <div className="bg-background border rounded-md p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">Verification Code</p>
                      <p className="text-xl font-bold mt-1 text-green-500">{verificationCode}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(verificationCode, 'code')}
                      className="h-8"
                    >
                      {copied === 'code' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
              
              {(orderId || existingOrderId) && (
                <div className="text-xs text-gray-500">
                  Order ID: {orderId || existingOrderId}
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter className="flex sm:justify-between">
          {status === 'failed' || (status === 'waiting' && remainingTime === 0) ? (
            <>
              <Button variant="secondary" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleRetry}>
                <RefreshCw className="h-4 w-4 mr-2" /> Try Again
              </Button>
            </>
          ) : status === 'completed' ? (
            <>
              <Button variant="secondary" onClick={handleClose}>Close</Button>
              <Button onClick={handleRetry}>Request New Number</Button>
            </>
          ) : status === 'cancelled' ? (
            <>
              <Button variant="secondary" onClick={handleClose}>Close</Button>
              <Button onClick={handleRetry}>Request New Number</Button>
            </>
          ) : status === 'waiting' ? (
            <>
              <Button 
                variant="destructive" 
                onClick={handleCancel}
                disabled={isLoading}
              >
                <XCircle className="h-4 w-4 mr-2" /> Cancel Number
              </Button>
              <Button variant="secondary" onClick={handleClose}>
                Continue in Background
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={handleClose} className="ml-auto">Cancel</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 