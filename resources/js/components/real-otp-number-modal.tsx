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

interface RealOtpNumberModalProps {
  open: boolean;
  onClose: () => void;
  serviceCode: string;
  serverCode: string;
  serviceName: string;
}

export function RealOtpNumberModal({
  open,
  onClose,
  serviceCode,
  serverCode,
  serviceName,
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
    MAX_RETRIES
  } = useRealOtpNumber();
  
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [remainingTime, setRemainingTime] = useState(300); // 5 minutes in seconds
  const [copied, setCopied] = useState<'phone' | 'code' | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Request the number when modal opens
  useEffect(() => {
    if (open && status === 'idle') {
      requestNumber({ 
        service_code: serviceCode, 
        server_code: serverCode,
        service_name: serviceName
      });
    }
    
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [open, serviceCode, serverCode, serviceName]);
  
  // Set up timer for checking status and countdown
  useEffect(() => {
    if (status === 'waiting' && orderId) {
      // Start status check interval
      const interval = setInterval(() => {
        checkStatus(orderId).catch(() => {
          // If there's an error during status check, we'll handle it in the hook
          setIsRetrying(retryCount > 0 && retryCount <= MAX_RETRIES);
        });
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
    }
  }, [status, orderId]);
  
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
  
  // Handle closing
  const handleClose = () => {
    if (checkInterval) {
      clearInterval(checkInterval);
    }
    reset();
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
    if (orderId) {
      if (checkInterval) {
        clearInterval(checkInterval);
        setCheckInterval(null);
      }
      await cancelNumber(orderId);
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
          
          {error && (
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
                        The system is waiting to receive the verification code
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
                </div>
              )}
              
              {status === 'completed' && verificationCode && (
                <div className="bg-background border rounded-md p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">Verification Code</p>
                      <p className="text-xl font-bold mt-1">{verificationCode}</p>
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
              
              {orderId && (
                <div className="text-xs text-gray-500">
                  Order ID: {orderId}
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
              <Button variant="secondary" onClick={handleClose}>Close</Button>
            </>
          ) : (
            <Button variant="secondary" onClick={handleClose} className="ml-auto">Cancel</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 