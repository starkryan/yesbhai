import { useEffect, useState } from 'react';

interface ServiceItem {
  service_code: string;
  server_code: string;
  price: string;
}

interface ServicesData {
  [key: string]: ServiceItem[];
}

interface ApiResponse {
  success: boolean;
  data: ServicesData;
  source?: 'api' | 'cache' | 'fallback' | 'emergency_cache' | 'sample';
  message?: string;
  original_error?: string;
}

export function useRealOtpServices() {
  const [services, setServices] = useState<ServicesData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string | null>(null);

  useEffect(() => {
    async function fetchServices() {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/realotp/services');
        const data: ApiResponse = await response.json();
        
        if (data.success && data.data) {
          setServices(data.data);
          setDataSource(data.source || 'api');
          
          // If it's using sample or fallback data, show a warning but don't treat as error
          if (data.source === 'sample' || data.source === 'fallback' || data.source === 'emergency_cache') {
            setError(`Note: Using ${data.source} data because the API is currently unavailable.`);
          }
        } else {
          setError(data.message || 'Failed to fetch services data');
        }
      } catch (err) {
        // console.error(err);
        setError('Error connecting to server. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchServices();
  }, []);

  return {
    services,
    isLoading,
    error,
    dataSource
  };
} 