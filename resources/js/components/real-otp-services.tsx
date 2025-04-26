import { useState } from 'react';
import { useRealOtpServices } from '@/hooks/useRealOtpServices';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription} from '@/components/ui/card';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw, Phone } from 'lucide-react';
import { RealOtpNumberModal } from './real-otp-number-modal';

export function RealOtpServices() {
  const { services, isLoading, error, dataSource } = useRealOtpServices();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // State for phone number request
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<{
    name: string;
    serviceCode: string;
    serverCode: string;
  } | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>OTP Services</CardTitle>
          <CardDescription>Loading services data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!services || Object.keys(services).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>OTP Services</CardTitle>
          <CardDescription className="text-amber-600">No services data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
            <p>No service data could be loaded. Please try again later.</p>
            {error && <p className="text-red-500 mt-2">{error}</p>}
            <Button className="mt-4" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get list of services filtered by search, handling empty service names
  const filteredServices = Object.keys(services)
    .map(name => name === "" ? "Unnamed Service" : name === " " ? "Unnamed Service (Space)" : name)
    .filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort();

  // Pagination for service names
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const paginatedServices = filteredServices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const toggleService = (serviceName: string) => {
    if (expandedService === serviceName) {
      setExpandedService(null);
    } else {
      setExpandedService(serviceName);
    }
  };

  // Convert display name back to original key for services object
  const getOriginalKey = (displayName: string) => {
    if (displayName === "Unnamed Service") return "";
    if (displayName === "Unnamed Service (Space)") return " ";
    return displayName;
  };
  
  // Handle requesting a number
  const handleRequestNumber = (serviceName: string, serviceCode: string, serverCode: string) => {
    setSelectedService({
      name: serviceName,
      serviceCode,
      serverCode
    });
    setRequestModalOpen(true);
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
         
          <CardDescription>
            Browse and select OTP services
            {error && (
              <div className="mt-2 flex items-center text-sm">
                <AlertCircle className="h-4 w-4 mr-1" /> {error}
              </div>
            )}
          </CardDescription>
          <div className="pt-4">
            <Input
              placeholder="Search services..."
              value={searchTerm}
              onChange={handleSearch}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            {paginatedServices.length > 0 ? (
              paginatedServices.map((serviceName) => {
                const originalKey = getOriginalKey(serviceName);
                const serviceItems = services[originalKey] || [];
                
                return (
                  <div key={serviceName} className="border-b last:border-b-0">
                    <div 
                      className="flex items-center justify-between gap-2 p-4 cursor-pointer"
                      onClick={() => toggleService(serviceName)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{serviceName}</span>
                        <span className="text-xs text-gray-500">({serviceItems.length} Servers)</span>
                      </div>
                      <div>
                        {expandedService === serviceName ? 
                          <ChevronUp className="h-5 w-5" /> : 
                          <ChevronDown className="h-5 w-5" />
                        }
                      </div>
                    </div>
                    
                    {expandedService === serviceName && (
                      <div className="p-4">
                        <div className="mb-2 grid grid-cols-3 gap-2 text-sm font-medium">
                          <div>Server</div>
                          <div>Country</div>
                          <div className="text-right">Price</div>
                        </div>
                        {serviceItems.length > 0 ? (
                          serviceItems.map((item, index) => (
                            <div 
                              key={`${item.service_code}-${item.server_code}-${index}`}
                              className="grid grid-cols-3 gap-2 py-2 border-t first:border-t-0 items-center"
                            >
                              <div className="text-sm font-medium">Server {item.server_code}</div>
                              <div className="flex items-center gap-1 text-sm">
                                <span className="inline-block">🇮🇳</span>India
                              </div>
                              <div className="flex items-center justify-end gap-3">
                                <span className="font-medium">₹{item.price}</span>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 bg-transparent"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRequestNumber(serviceName, item.service_code, item.server_code);
                                  }}
                                >
                                  <Phone className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-4 text-center text-gray-500">
                            No options available for this service.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-gray-500">
                No services found matching your search.
              </div>
            )}
          </div>
          
          {totalPages > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  // Show pages around current page
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }
                  
                  return (
                    <PaginationItem key={i}>
                      <PaginationLink
                        isActive={pageNumber === currentPage}
                        onClick={() => handlePageChange(pageNumber)}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
       
      </Card>
      
      {selectedService && (
        <RealOtpNumberModal
          open={requestModalOpen}
          onClose={() => {
            setRequestModalOpen(false);
            setSelectedService(null);
          }}
          serviceName={selectedService.name}
          serviceCode={selectedService.serviceCode}
          serverCode={selectedService.serverCode}
        />
      )}
    </>
  );
} 