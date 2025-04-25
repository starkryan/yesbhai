import { useState } from 'react';

interface RequestNumberParams {
  service_code: string;
  server_code: string;
  service_name?: string;
}

interface RequestNumberResponse {
  success: boolean;
  phone_number?: string;
  order_id?: string;
  message?: string;
  raw_response?: string;
}

interface CheckStatusResponse {
  success: boolean;
  status?: 'waiting' | 'completed';
  verification_code?: string;
  message?: string;
  raw_response?: string;
}

interface CancelNumberResponse {
  success: boolean;
  message?: string;
  raw_response?: string;
}

export function useRealOtpNumber() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'requesting' | 'waiting' | 'completed' | 'failed' | 'cancelled'>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const requestNumber = async (params: RequestNumberParams) => {
    try {
      setIsLoading(true);
      setError(null);
      setStatus('requesting');
      
      const serviceNameParam = params.service_name ? `&service_name=${encodeURIComponent(params.service_name)}` : '';
      const url = `/api/realotp/number?service_code=${encodeURIComponent(params.service_code)}&server_code=${encodeURIComponent(params.server_code)}${serviceNameParam}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      const data: RequestNumberResponse = await response.json();
      
      if (data.success && data.phone_number && data.order_id) {
        setPhoneNumber(data.phone_number);
        setOrderId(data.order_id);
        setStatus('waiting');
        return {
          success: true,
          phone_number: data.phone_number,
          order_id: data.order_id
        };
      } else {
        const errorMessage = data.message || 'Failed to request number';
        setError(errorMessage);
        setStatus('failed');
        return {
          success: false,
          error: errorMessage
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error requesting number';
      setError(errorMessage);
      setStatus('failed');
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  };

  const checkStatus = async (orderId: string) => {
    try {
      setIsLoading(true);
      
      const url = `/api/realotp/status?order_id=${encodeURIComponent(orderId)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      const data: CheckStatusResponse = await response.json();
      
      // Reset retry count on successful response
      setRetryCount(0);
      setError(null);
      
      if (data.success) {
        if (data.status === 'completed' && data.verification_code) {
          setVerificationCode(data.verification_code);
          setStatus('completed');
          return {
            success: true,
            status: 'completed',
            verification_code: data.verification_code
          };
        } else if (data.status === 'waiting') {
          setStatus('waiting');
          return {
            success: true,
            status: 'waiting'
          };
        }
      }
      
      setError(data.message || 'Failed to check status');
      return {
        success: false,
        error: data.message
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error checking status';
      
      // Only show the error if we've exceeded max retries
      if (retryCount >= MAX_RETRIES) {
        setError(errorMessage);
      }
      
      // Increment retry count on error
      setRetryCount(prev => prev + 1);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  };

  const cancelNumber = async (orderId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const url = `/api/realotp/cancel?order_id=${encodeURIComponent(orderId)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      const data: CancelNumberResponse = await response.json();
      
      if (data.success) {
        setStatus('cancelled');
        return {
          success: true,
          message: data.message || 'Number cancelled successfully',
        };
      } else {
        const errorMessage = data.message || 'Failed to cancel number';
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cancelling number';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setPhoneNumber(null);
    setOrderId(null);
    setVerificationCode(null);
    setError(null);
    setStatus('idle');
    setRetryCount(0);
  };

  return {
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
  };
} 