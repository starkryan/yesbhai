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
  startTime?: number; // Make startTime optional to fix type issues
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
          // console.error("Error parsing persisted OTP state", e);
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
              // console.error("Background OTP check failed", err);
              // Update last checked timestamp even on error
              state.lastChecked = Date.now();
              localStorage.setItem(stateKey, JSON.stringify(state));
            });
        } catch (e) {
          // Handle JSON parse errors
              // console.error("Error parsing persisted OTP state", e);
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
      startTime: state.startTime || Date.now(), // Use provided startTime or current time
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
        // console.error("Error loading persisted state", e);
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
      
      try {
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
              message: 'Insufficient wallet balance',
              current_balance: data.wallet_balance || data.current_balance || '0.00',
              required_price: data.required_price || data.price || '0.00'
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
        // Silent error - don't log to console
        const errorMessage = 'Request failed. Please try again later.';
        setError(errorMessage);
        setStatus('failed');
        return {
          success: false,
          error: errorMessage
        };
      }
    } finally {
      setIsLoading(false);
    }
  };

  const checkStatus = async (orderId: string, isTimeout: boolean = false) => {
    try {
      setIsLoading(true);
      
      // Store the order ID when checking status of an existing order
      if (!phoneNumber) {
        setOrderId(orderId);
        setStatus('waiting');
      }
      
      try {
        const url = `/api/realotp/status?order_id=${encodeURIComponent(orderId)}${isTimeout ? '&timeout=true' : ''}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error('API request failed');
        }
        
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
            // Continue wait mode
            return {
              success: true,
              status: 'waiting'
            };
          }
        }
        
        // If we get here, something went wrong with the response
        const errorMessage = data.message || 'Status check failed';
        setError(errorMessage);
        
        // Increment retry count
        if (retryCount < MAX_RETRIES) {
          setRetryCount(prev => prev + 1);
        } else {
          setStatus('failed');
        }
        
        return {
          success: false,
          error: errorMessage
        };
      } catch (err) {
        // Silent error - don't log to console
        if (retryCount < MAX_RETRIES) {
          setRetryCount(prev => prev + 1);
        } else {
          setStatus('failed');
          setError('Network error, please try again');
        }
        
        return {
          success: false,
          error: 'Network error'
        };
      }
    } finally {
      setIsLoading(false);
    }
  };

  const cancelNumber = async (orderId: string) => {
    try {
      setIsLoading(true);
      
      try {
        const url = `/api/realotp/cancel?order_id=${encodeURIComponent(orderId)}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        const data: CancelNumberResponse = await response.json();
        
        // Clean up persistent state if exists
        localStorage.removeItem(createStateKey(orderId));
        
        // Clean up background check if exists
        if (activeOtpChecks[orderId]) {
          clearInterval(activeOtpChecks[orderId]);
          delete activeOtpChecks[orderId];
        }
        
        if (data.success) {
          setStatus('cancelled');
          return { success: true };
        } else {
          setStatus('failed');
          setError(data.message || 'Failed to cancel number');
          return {
            success: false,
            error: data.message
          };
        }
      } catch (err) {
        // Silent error - don't log to console
        setStatus('failed');
        const errorMessage = 'Network error, please try again';
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage
        };
      }
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