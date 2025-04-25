import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { RealOtpStats } from '@/components/real-otp-stats';
import { RealOtpServices } from '@/components/real-otp-services';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: '/dashboard',
    },
];

export default function Dashboard() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="OTP Services Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold tracking-tight">OTP Services Dashboard</h1>
                    <p className="text-sm text-gray-500">
                        Browse and manage OTP services from RealOTP
                    </p>
                </div>
                
                <RealOtpStats />
                
                <Tabs defaultValue="services" className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="services">
                            Services
                        </TabsTrigger>
                        <TabsTrigger value="recent">
                            Recent Orders
                        </TabsTrigger>
                        <TabsTrigger value="balance">
                            Balance & History
                        </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="services" className="mt-0">
                        <RealOtpServices />
                    </TabsContent>
                    
                    <TabsContent value="recent" className="mt-0">
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Orders</CardTitle>
                                <CardDescription>
                                    Your recent OTP service purchases
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center justify-center py-8">
                                <div className="text-center">
                                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                                        <Search className="h-6 w-6 text-gray-500" />
                                    </div>
                                    <p className="text-gray-500">No recent orders found</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="balance" className="mt-0">
                        <Card>
                            <CardHeader>
                                <CardTitle>Balance & History</CardTitle>
                                <CardDescription>
                                    Your account balance and transaction history
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center justify-center py-8">
                                <div className="text-center">
                                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                                        <Search className="h-6 w-6 text-gray-500" />
                                    </div>
                                    <p className="text-gray-500">No transaction history available</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
