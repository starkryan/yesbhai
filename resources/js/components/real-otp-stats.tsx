import { useRealOtpServices } from '@/hooks/useRealOtpServices';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Database, RefreshCw, ShoppingCart, Server } from 'lucide-react';

export function RealOtpStats() {
  const { services, isLoading, error, dataSource } = useRealOtpServices();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-2 bg-gradient-to-r from-gray-50 to-gray-100">
              <CardTitle className="text-sm font-medium">
                <Skeleton className="h-4 w-32" />
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!services) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>OTP Service Statistics</CardTitle>
          <CardDescription className="text-amber-600">
            Data unavailable
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
          <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
          <p className="text-gray-600">Unable to load service statistics.</p>
          <Button className="mt-3" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Calculate statistics
  const totalServices = Object.keys(services).length;
  
  // Count total items across all services
  const totalItems = Object.values(services)
    .reduce((acc, items) => acc + items.length, 0);
  
  // Calculate average price
  const allPrices = Object.values(services)
    .flatMap(items => items.map(item => parseFloat(item.price)));
  
  const averagePrice = allPrices.length > 0
    ? (allPrices.reduce((acc, price) => acc + price, 0) / allPrices.length).toFixed(2)
    : '0.00';

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="overflow-hidden border-blue-100 shadow-sm">
          <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-100">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-blue-700">
              <Database className="h-4 w-4" />
              Total Services
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totalServices}</div>
            <p className="text-sm text-gray-500 mt-1">Available service providers</p>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-emerald-100 shadow-sm">
          <CardHeader className="pb-2 bg-gradient-to-r from-emerald-50 to-emerald-100 border-b border-emerald-100">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <Server className="h-4 w-4" />
              Total Service Options
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-sm text-gray-500 mt-1">Across all providers</p>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-amber-100 shadow-sm">
          <CardHeader className="pb-2 bg-gradient-to-r from-amber-50 to-amber-100 border-b border-amber-100">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-amber-700">
              <ShoppingCart className="h-4 w-4" />
              Average Price
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">₹{averagePrice}</div>
            <p className="text-sm text-gray-500 mt-1">Per service</p>
          </CardContent>
          {dataSource && dataSource !== 'api' && (
            <CardFooter className="py-2 px-4 bg-amber-50 border-t border-amber-100">
              <span className="text-xs text-amber-700 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                Using {dataSource} data
              </span>
            </CardFooter>
          )}
        </Card>
      </div>
      
      {error && (
        <div className="mt-2 p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-sm flex items-center">
          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </>
  );
} 