import { toast } from 'sonner';

/**
 * Hook for using toast notifications throughout the application
 * Wraps the sonner toast functions with pre-configured settings
 */
export function useToast() {
  return {
    /**
     * Show a success toast notification
     */
    success: (message: string, options?: Parameters<typeof toast.success>[1]) => {
      toast.success(message, options);
    },
    
    /**
     * Show an error toast notification
     */
    error: (message: string, options?: Parameters<typeof toast.error>[1]) => {
      toast.error(message, options);
    },
    
    /**
     * Show an info toast notification
     */
    info: (message: string, options?: Parameters<typeof toast.info>[1]) => {
      toast.info(message, options);
    },
    
    /**
     * Show a warning toast notification
     */
    warning: (message: string, options?: Parameters<typeof toast.warning>[1]) => {
      toast.warning(message, options);
    },
    
    /**
     * Show a default toast notification
     */
    default: (message: string, options?: Parameters<typeof toast>[1]) => {
      toast(message, options);
    },
    
    /**
     * Show a toast with promise
     */
    promise: <T extends Promise<any>>(
      promise: T,
      options: Parameters<typeof toast.promise<T>>[1]
    ) => {
      return toast.promise(promise, options);
    },
    
    /**
     * Dismiss all toasts
     */
    dismiss: () => {
      toast.dismiss();
    }
  };
} 