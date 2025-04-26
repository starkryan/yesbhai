import { useState, useEffect } from 'react';

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
  current_balance?: string;
  required_price?: string;
  price?: string;
  wallet_balance?: string;
}

interface CheckStatusResponse {
  success: boolean;
  status?: 'waiting' | 'completed' | 'cancelled';
  verification_code?: string;
  phone_number?: string;
  message?: string;
  raw_response?: string;
}

interface CancelNumberResponse {
  success: boolean;
  message?: string;
  raw_response?: string;
}

interface PersistedState {
  phoneNumber: string | null;
  serviceCode: string;
  serverCode: string;
  serviceName: string;
  lastChecked?: number;
}

// Create localStorage key with prefix to avoid conflicts
const createStateKey = (orderId: string) => `otp_state_${orderId}`;

// Global registry for active OTP checks (shared across component instances)
const activeOtpChecks: Record<string, NodeJS.Timeout> = {};

export function useRealOtpNumber() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'requesting' | 'waiting' | 'completed' | 'failed' | 'cancelled'>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const BACKGROUND_CHECK_INTERVAL = 10000; // 10 seconds between background checks

  // Set up global background checking on mount
  useEffect(() => {
    // Check for any persisted OTPs when component mounts
    checkForPersistedOtps();

    return () => {
      // Clean up any active background checks when component unmounts
      if (orderId && activeOtpChecks[orderId]) {
        clearInterval(activeOtpChecks[orderId]);
        delete activeOtpChecks[orderId];
      }
    };
  }, []);

  // Check for any persisted OTPs that need background monitoring
  const checkForPersistedOtps = () => {
    // Look for all localStorage keys with our prefix
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('otp_state_')) {
        const orderId = key.replace('otp_state_', '');
        
        try {
          const stateStr = localStorage.getItem(key);
          if (stateStr) {
            const state = JSON.parse(stateStr) as PersistedState;
            const lastChecked = state.lastChecked || 0;
            const now = Date.now();
            
            // Only start background check if not already running and was checked within last 10 minutes
            if (!activeOtpChecks[orderId] && (now - lastChecked) < 10 * 60 * 1000) {
              setupBackgroundCheck(orderId);
            }
          }
        } catch (e) {
          // Ignore JSON parse errors
          console.error("Error parsing persisted OTP state", e);
        }
      }
    }
  };

  // Setup background checking for a specific OTP
  const setupBackgroundCheck = (otpOrderId: string) => {
    if (activeOtpChecks[otpOrderId]) {
      clearInterval(activeOtpChecks[otpOrderId]);
    }
    
    // Set up periodic checking in the background
    activeOtpChecks[otpOrderId] = setInterval(() => {
      // Only do the check if state exists 
      const stateKey = createStateKey(otpOrderId);
      const stateStr = localStorage.getItem(stateKey);
      
      if (stateStr) {
        try {
          const state = JSON.parse(stateStr) as PersistedState;
          
          // Call the API to check status
          fetch(`/api/realotp/status?order_id=${encodeURIComponent(otpOrderId)}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          })
            .then(response => response.json())
            .then((data: CheckStatusResponse) => {
              if (data.success) {
                // Update the last checked timestamp
                state.lastChecked = Date.now();
                localStorage.setItem(stateKey, JSON.stringify(state));
                
                // If completed or cancelled, clean up
                if (data.status === 'completed' || data.status === 'cancelled') {
                  // Show toast notification (if notification API is available)
                  if (data.status === 'completed' && data.verification_code) {
                    // Try to show a notification
                    if ('Notification' in window && Notification.permission === 'granted') {
                      new Notification('OTP Code Received', {
                        body: `Your verification code is: ${data.verification_code}`,
                      });
                    }
                    
                    // Use toast from app context if available
                    if (typeof window !== 'undefined' && 'toast' in window && typeof (window as any).toast?.success === 'function') {
                      (window as any).toast.success(`OTP Code Received: ${data.verification_code}`, {
                        description: `For service: ${state.serviceName}`,
                        action: {
                          label: 'Copy',
                          onClick: () => navigator.clipboard.writeText(data.verification_code || '')
                        }
                      });
                    }
                  }
                  
                  // Clean up
                  clearInterval(activeOtpChecks[otpOrderId]);
                  delete activeOtpChecks[otpOrderId];
                  localStorage.removeItem(stateKey);
                }
              }
            })
            .catch(err => {
              console.error("Background OTP check failed", err);
              // Update last checked timestamp even on error
              state.lastChecked = Date.now();
              localStorage.setItem(stateKey, JSON.stringify(state));
            });
        } catch (e) {
          // Handle JSON parse errors
          console.error("Error parsing persisted OTP state", e);
          localStorage.removeItem(stateKey);
        }
      } else {
        // State no longer exists, clean up
        clearInterval(activeOtpChecks[otpOrderId]);
        delete activeOtpChecks[otpOrderId];
      }
    }, BACKGROUND_CHECK_INTERVAL);
  };

  // Persist current OTP state so it can be continued in the background
  const persistState = (otpOrderId: string, state: Omit<PersistedState, 'lastChecked'>) => {
    const persistedState: PersistedState = {
      ...state,
      lastChecked: Date.now()
    };
    
    localStorage.setItem(createStateKey(otpOrderId), JSON.stringify(persistedState));
    
    // Set up background checking
    setupBackgroundCheck(otpOrderId);
  };

  // Load a previously persisted state
  const loadPersistedState = (otpOrderId: string) => {
    const stateKey = createStateKey(otpOrderId);
    const stateStr = localStorage.getItem(stateKey);
    
    if (stateStr) {
      try {
        const state = JSON.parse(stateStr) as PersistedState;
        
        // Restore the state
        if (state.phoneNumber) {
          setPhoneNumber(state.phoneNumber);
        }
        setOrderId(otpOrderId);
        setStatus('waiting');
        
        return true;
      } catch (e) {
        console.error("Error loading persisted state", e);
        localStorage.removeItem(stateKey);
      }
    }
    
    return false;
  };

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
        let errorMessage = data.message || 'Failed to request number';
        
        // Special handling for insufficient balance
        if (response.status === 403 && data.message && data.message.includes('Insufficient wallet balance')) {
          errorMessage = JSON.stringify({
            message: data.message,
            current_balance: data.current_balance,
            required_price: data.required_price
          });
        }
        
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
      
      // Store the order ID when checking status of an existing order
      if (!phoneNumber) {
        setOrderId(orderId);
        setStatus('waiting');
      }
      
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
        // Update phone number if available and not set yet
        if (data.phone_number && !phoneNumber) {
          setPhoneNumber(data.phone_number);
        }
        
        if (data.status === 'completed' && data.verification_code) {
          setVerificationCode(data.verification_code);
          setStatus('completed');
          
          // Clean up persistent state if exists
          localStorage.removeItem(createStateKey(orderId));
          
          // Clean up background check if exists
          if (activeOtpChecks[orderId]) {
            clearInterval(activeOtpChecks[orderId]);
            delete activeOtpChecks[orderId];
          }
          
          return {
            success: true,
            status: 'completed',
            verification_code: data.verification_code
          };
        } else if (data.status === 'cancelled') {
          setStatus('cancelled');
          
          // Clean up persistent state if exists
          localStorage.removeItem(createStateKey(orderId));
          
          // Clean up background check if exists
          if (activeOtpChecks[orderId]) {
            clearInterval(activeOtpChecks[orderId]);
            delete activeOtpChecks[orderId];
          }
          
          return {
            success: true,
            status: 'cancelled'
          };
        } else if (data.status === 'waiting') {
          // If we're checking an existing order but don't have the phone number yet,
          // try to extract it from the raw response if available
          if (!phoneNumber && data.raw_response) {
            try {
              // Try to parse the raw response for phone number information
              // This depends on the format of your API response
              const regex = /\b(\d{10,15})\b/; // Match 10-15 digit phone numbers
              const match = data.raw_response.match(regex);
              if (match && match[1]) {
                setPhoneNumber(match[1]);
              }
            } catch (e) {
              // Ignore extraction errors
            }
          }
          
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
        
        // Clean up any persistent state
        localStorage.removeItem(createStateKey(orderId));
        
        // Clean up background check if exists
        if (activeOtpChecks[orderId]) {
          clearInterval(activeOtpChecks[orderId]);
          delete activeOtpChecks[orderId];
        }
        
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
    // Clean up any persistent state if order ID exists
    if (orderId) {
      localStorage.removeItem(createStateKey(orderId));
      
      // Clean up background check if exists
      if (activeOtpChecks[orderId]) {
        clearInterval(activeOtpChecks[orderId]);
        delete activeOtpChecks[orderId];
      }
    }
    
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
    MAX_RETRIES,
    persistState,
    loadPersistedState
  };
} 