import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, AlertCircle, Clock, CheckCircle, XCircle, Copy, ExternalLink, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
// import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner'; 

interface OtpPurchase {
  id: number;
  user_id: number;
  order_id: string;
  phone_number: string;
  service_name: string;
  service_code: string;
  server_code: string;
  price: string | null;
  verification_code: string | null;
  status: 'waiting' | 'completed' | 'cancelled' | 'expired';
  verification_received_at: string | null;
  cancelled_at: string | null;
  expired_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse {
  current_page: number;
  data: OtpPurchase[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: {
    url: string | null;
    label: string;
    active: boolean;
  }[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

export function UserOtpPurchases() {
  const [purchases, setPurchases] = useState<OtpPurchase[]>([]);
  const [pagination, setPagination] = useState<Omit<PaginatedResponse, 'data'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [copied, setCopied] = useState<{id: number, field: 'phone' | 'code'} | null>(null);
  
  // State for cancelling modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<OtpPurchase | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
 

  useEffect(() => {
    fetchPurchases(currentPage);
  }, [currentPage]);

  const fetchPurchases = async (page: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/realotp/purchases?page=${page}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setPurchases(data.data.data);
        
        const { data: _, ...paginationData } = data.data;
        setPagination(paginationData);
      } else {
        setError(data.message || 'Failed to fetch OTP purchases');
      }
    } catch (err) {
      console.error(err);
      setError('Error connecting to server. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: number, field: 'phone' | 'code') => {
    navigator.clipboard.writeText(text);
    setCopied({ id, field });
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusBadge = (status: OtpPurchase['status']) => {
    switch (status) {
      case 'waiting':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Waiting</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCancelClick = (purchase: OtpPurchase) => {
    setSelectedPurchase(purchase);
    setCancelModalOpen(true);
  };

  const cancelOtp = async () => {
    if (!selectedPurchase) return;
    
    setIsCancelling(true);
    try {
      const response = await fetch(`/api/realotp/cancel?order_id=${selectedPurchase.order_id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setPurchases(purchases.map(p => 
          p.id === selectedPurchase.id ? { ...p, status: 'cancelled' } : p
        ));
        
        toast.success("OTP Cancelled", {
          description: "Your OTP number has been successfully cancelled.",
        });
      } else {
        toast.error("Error", {
          description: data.message || "Failed to cancel OTP. Please try again.",
        });
      }
    } catch (error) {
      toast.error("Error", {
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsCancelling(false);
      setCancelModalOpen(false);
    }
  };

  if (isLoading && purchases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent OTP Purchases</CardTitle>
          <CardDescription>Your recent OTP service purchases</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent OTP Purchases</CardTitle>
          <CardDescription>Your recent OTP service purchases</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <p className="text-gray-500">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (purchases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent OTP Purchases</CardTitle>
          <CardDescription>Your recent OTP service purchases</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <Search className="h-6 w-6 text-gray-500" />
              </div>
              <p className="text-gray-500">No OTP purchases found</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Recent OTP Purchases</CardTitle>
          <CardDescription>Your recent OTP service purchases</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verification Code</TableHead>
                  <TableHead>Purchased</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-medium">
                      {purchase.service_name}
                      <div className="text-xs text-gray-500">
                        Server: {purchase.server_code}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span>{purchase.phone_number}</span>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(purchase.phone_number, purchase.id, 'phone')}
                        >
                          {copied?.id === purchase.id && copied?.field === 'phone' 
                            ? <CheckCircle className="h-3.5 w-3.5" /> 
                            : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(purchase.status)}
                    </TableCell>
                    <TableCell>
                      {purchase.verification_code ? (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{purchase.verification_code}</span>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(purchase.verification_code!, purchase.id, 'code')}
                          >
                            {copied?.id === purchase.id && copied?.field === 'code' 
                              ? <CheckCircle className="h-3.5 w-3.5" /> 
                              : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">
                          {purchase.status === 'waiting' ? 'Waiting for code...' : 'No code received'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDate(purchase.created_at)}</div>
                      {purchase.verification_received_at && (
                        <div className="text-xs text-gray-500">
                          Received: {formatDate(purchase.verification_received_at)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {purchase.status === 'waiting' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleCancelClick(purchase)}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pagination && pagination.last_page > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className={currentPage === 1 ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: pagination.last_page }).map((_, i) => {
                    const page = i + 1;
                    
                    // Show first page, last page, and pages around current page
                    if (
                      page === 1 ||
                      page === pagination.last_page ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={page === currentPage}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }
                    
                    // Show ellipsis for page gaps
                    if (
                      (page === 2 && currentPage > 3) ||
                      (page === pagination.last_page - 1 && currentPage < pagination.last_page - 2)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    
                    return null;
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(prev => Math.min(pagination.last_page, prev + 1))}
                      className={currentPage === pagination.last_page ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t p-4 text-xs text-gray-500">
          Showing {purchases.length} of {pagination?.total || 0} purchases
        </CardFooter>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel OTP Number</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this OTP number? Your funds will be returned to your account.
            </DialogDescription>
          </DialogHeader>

          {selectedPurchase && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Service</p>
                  <p className="text-sm">{selectedPurchase.service_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone Number</p>
                  <p className="text-sm">{selectedPurchase.phone_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Order ID</p>
                  <p className="text-sm font-mono">{selectedPurchase.order_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Purchased</p>
                  <p className="text-sm">{formatDate(selectedPurchase.created_at)}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex sm:justify-between">
            <Button variant="secondary" onClick={() => setCancelModalOpen(false)}>
              No, Keep It
            </Button>
            <Button 
              variant="destructive" 
              onClick={cancelOtp}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Number
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 