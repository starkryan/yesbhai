import { useState, useEffect } from 'react';
import { Head, useForm as useInertiaForm } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, Plus, Minus, Search } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { debounce } from 'lodash';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  wallet_balance: string;
  reserved_balance: string;
  created_at: string;
}

interface PaginationLinks {
  first_page_url: string;
  last_page_url: string;
  next_page_url: string | null;
  prev_page_url: string | null;
  path: string;
}

interface PaginationMeta {
  current_page: number;
  from: number;
  last_page: number;
  links: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
  path: string;
  per_page: number;
  to: number;
  total: number;
}

interface UsersPageProps {
  users: {
    data: User[];
    links: PaginationLinks;
    meta?: PaginationMeta;
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
  };
  filters: {
    search: string;
    perPage: number;
  };
}

const formSchema = z.object({
  amount: z.coerce.number().min(1, {
    message: 'Amount must be at least 1',
  }),
  type: z.enum(['add', 'deduct'], {
    required_error: 'Please select an operation type',
  }),
  description: z.string().min(2, {
    message: 'Description must be at least 2 characters',
  }),
});

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Home',
    href: '/dashboard',
  },
  {
    title: 'Admin',
    href: '/admin',
  },
  {
    title: 'Users',
    href: '/admin/users',
  },
];

export default function Users({ users, filters }: UsersPageProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState(filters.search);
  const [perPage, setPerPage] = useState(filters.perPage.toString());

  const { data, setData, get } = useInertiaForm({
    search: filters.search,
    perPage: filters.perPage,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      type: 'add',
      description: '',
    },
  });

  // Debounced search function
  const debouncedSearch = debounce(() => {
    router.get('/admin/users', { search: searchQuery, perPage: perPage }, { preserveState: true });
  }, 300);

  // Effect to handle search debounce
  useEffect(() => {
    debouncedSearch();
    return () => debouncedSearch.cancel();
  }, [searchQuery]);

  // Handle per page change
  const handlePerPageChange = (value: string) => {
    setPerPage(value);
    router.get('/admin/users', { search: searchQuery, perPage: parseInt(value) }, { preserveState: true });
  };

  // Handle pagination click
  const handlePaginationClick = (url: string) => {
    if (!url) return;
    
    // Extract page number from URL
    const urlParams = new URLSearchParams(url.split('?')[1]);
    const page = urlParams.get('page');
    
    if (page) {
      router.get('/admin/users', { 
        search: searchQuery, 
        perPage: perPage,
        page: page 
      }, { preserveState: true });
    }
  };

  const handleManageBalance = (user: User) => {
    setSelectedUser(user);
    setIsOpen(true);
    form.reset({
      amount: 0,
      type: 'add',
      description: `Admin adjustment for ${user.name}`,
    });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!selectedUser) return;
    
    setIsSubmitting(true);
    try {
      const response = await axios.post(`/api/admin/users/${selectedUser.id}/balance`, values);
      
      if (response.data.success) {
        toast.success('Balance updated successfully');
        // Close the dialog
        setIsOpen(false);
        // Reload the page
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating balance:', error);
      toast.error('Failed to update balance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    return new Date(dateString).toLocaleDateString('en-IN', options);
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Admin - Manage Users" />
      <div className="flex h-full flex-1 flex-col gap-6 p-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Manage Users</h1>
          <p className="text-sm text-gray-500">
            View and manage user accounts and balances
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>User Accounts</CardTitle>
            <CardDescription>
              View all registered users and manage their wallet balances
            </CardDescription>
            
            <div className="mt-4 flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by name, email or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Show:</span>
                <Select value={perPage} onValueChange={handlePerPageChange}>
                  <SelectTrigger className="w-[80px]">
                    <SelectValue placeholder="10" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Wallet Balance</TableHead>
                    <TableHead>Reserved Balance</TableHead>
                    <TableHead>Available Balance</TableHead>
                    <TableHead>Created On</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.data && users.data.length > 0 ? (
                    users.data.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.id}</TableCell>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.role === 'admin' ? (
                            <Badge className="bg-purple-500">Admin</Badge>
                          ) : (
                            <Badge variant="outline">User</Badge>
                          )}
                        </TableCell>
                        <TableCell>₹{parseFloat(user.wallet_balance).toFixed(2)}</TableCell>
                        <TableCell>₹{parseFloat(user.reserved_balance).toFixed(2)}</TableCell>
                        <TableCell>
                          ₹{(parseFloat(user.wallet_balance) - parseFloat(user.reserved_balance)).toFixed(2)}
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleManageBalance(user)}
                          >
                            Manage Balance
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-4">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {users.last_page > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500">
                  Showing {users.from} to {users.to} of {users.total} users
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePaginationClick(users.links.prev_page_url || '')}
                    disabled={!users.links.prev_page_url}
                  >
                    Previous
                  </Button>
                  
                  {users.links && Array.from({ length: users.last_page }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={page === users.current_page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePaginationClick(`${users.links.path}?page=${page}`)}
                    >
                      {page}
                    </Button>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePaginationClick(users.links.next_page_url || '')}
                    disabled={!users.links.next_page_url}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Manage Wallet Balance</DialogTitle>
            <DialogDescription>
              {selectedUser ? `Adjust balance for ${selectedUser.name}` : 'Loading...'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Current Balance:</p>
                  <p className="text-lg font-bold">₹{parseFloat(selectedUser.wallet_balance).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Available Balance:</p>
                  <p className="text-lg font-bold">
                    ₹{(parseFloat(selectedUser.wallet_balance) - parseFloat(selectedUser.reserved_balance)).toFixed(2)}
                  </p>
                </div>
              </div>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operation</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select operation" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="add">
                              <div className="flex items-center gap-2">
                                <Plus className="h-4 w-4 text-green-500" />
                                <span>Add Balance</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="deduct">
                              <div className="flex items-center gap-2">
                                <Minus className="h-4 w-4 text-red-500" />
                                <span>Deduct Balance</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            step="0.01"
                            placeholder="Enter amount"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Reason for adjustment" {...field} />
                        </FormControl>
                        <FormDescription>
                          This will appear in the user's transaction history
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirm
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
} 