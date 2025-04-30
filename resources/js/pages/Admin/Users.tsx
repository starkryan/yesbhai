import { useState } from 'react';
import { Head } from '@inertiajs/react';
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
  DialogTrigger,
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
import { Loader2, Plus, Minus } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  wallet_balance: string;
  reserved_balance: string;
  created_at: string;
}

interface UsersPageProps {
  users: User[];
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

export default function Users({ users }: UsersPageProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      type: 'add',
      description: '',
    },
  });

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
        // Update the user's balance in the UI
        const updatedUsers = users.map(user => {
          if (user.id === selectedUser.id) {
            return {
              ...user,
              wallet_balance: response.data.current_balance,
            };
          }
          return user;
        });
        
        // Close the dialog
        setIsOpen(false);
        // You would typically reload or update the page here
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
                  {users.map((user) => (
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
                  ))}
                </TableBody>
              </Table>
            </div>
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