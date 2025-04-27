import React from 'react'
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Telegram Channel',
        href: '/telegram',
    },
];

function Telegram() {
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
        <Head title="Telegram Channel" />
        <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight">Telegram Channel</h1>
                <p className="text-sm ">
                    Join our Telegram community for support and updates
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Our Official Telegram Channel</CardTitle>
                    <CardDescription>
                        Get faster support and stay updated with our latest news
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-center">
                        <div className=" rounded-lg p-6 mb-6">
                            <img 
                                src="https://telegram.org/img/t_logo.png" 
                                alt="Telegram Logo" 
                                className="h-24 mx-auto mb-4"
                            />
                            <h3 className="text-xl font-bold mb-2">OTP MAYA Support</h3>
                            <p className="mb-4">
                                Join our official Telegram channel for:
                            </p>
                            <ul className="text-left list-disc pl-5 space-y-1 mb-6">
                                <li>Instant support from our team</li>
                                <li>Service status updates</li>
                                <li>New feature announcements</li>
                                <li>Special offers and promotions</li>
                                <li>Community discussions</li>
                            </ul>
                            <Button >
                                <a 
                                    href="https://t.me/otpmaya" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center"
                                >
                                    Join Telegram Channel
                                    <ExternalLink className="ml-2 h-4 w-4" />
                                </a>
                            </Button>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-2">Why Join Our Telegram Channel?</h3>
                        <p className="mb-4">
                            Our Telegram channel offers the fastest way to get assistance with any issues you might 
                            encounter while using our OTP services. Our support team monitors the channel regularly 
                            and responds to inquiries promptly.
                        </p>
                        <p >
                            Additionally, we share important updates about our services, announce new features, 
                            and occasionally offer special promotions exclusively for our Telegram community members.
                        </p>
                    </div>
                </CardContent>
            </Card>

            
        </div>
    </AppLayout>
  )
}

export default Telegram 