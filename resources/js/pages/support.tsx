import React from 'react'
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Support',
        href: '/support',
    },
];

function Support() {
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
        <Head title="Support" />
        <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight">Support</h1>
                <p className="text-sm">
                    Get help with our OTP services
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Customer Support</CardTitle>
                    <CardDescription>
                        We're here to help with any questions or issues
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Contact Methods</h3>
                        <p >
                            Our support team is available to assist you through the following channels:
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 ">
                            <li>Email: <a href="mailto:support@realotp.com" className="text-blue-600 hover:underline">support@realotp.com</a></li>
                            <li>Live Chat: Available on dashboard during business hours</li>
                            <li>Telegram: Join our <a href="/telegram" className="text-blue-600 hover:underline">Telegram channel</a> for quick responses</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Response Times</h3>
                        <p >
                            We strive to respond to all inquiries within:
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 ">
                            <li><span className="font-medium">Email:</span> 24 hours</li>
                            <li><span className="font-medium">Live Chat:</span> Immediate during business hours</li>
                            <li><span className="font-medium">Telegram:</span> Within 2-3 hours</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Frequently Asked Questions</CardTitle>
                    <CardDescription>
                        Quick answers to common questions
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">How do OTP services work?</h3>
                        <p >
                            Our OTP services provide temporary phone numbers for receiving verification codes. 
                            Simply select the service you need, purchase the OTP, and receive the verification 
                            code directly in your account dashboard.
                        </p>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-2">What if I don't receive an OTP?</h3>
                        <p >
                            If you don't receive an expected OTP within 5 minutes, you can check the status 
                            in your dashboard. For technical issues not related to incorrect usage, please contact support.
                        </p>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-2">How do I add funds to my account?</h3>
                        <p >
                            You can add funds through the Recharge section in your dashboard. 
                            We support UPI Payment Method.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    </AppLayout>
  )
}

export default Support 