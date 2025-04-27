import React from 'react'
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Privacy Policy',
        href: '/privacy',
    },
];

function Privacy() {
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
        <Head title="Privacy Policy" />
        <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
                <p className="text-sm ">
                    Our policies regarding your data and service usage
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Refund Policy for OTP Services</CardTitle>
                    <CardDescription>
                        Important information about our refund policies
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">No Refund Policy</h3>
                        <p >
                            Please be advised that we do not provide refunds in the following circumstances:
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 ">
                            <li>Wrong OTP received</li>
                            <li>Number Already Used</li>
                            <li>Two Factor Authentication issues</li>
                            <li>Instant Ban</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-2">OTP Service Usage</h3>
                        <p >
                            Our OTP services are provided on an as-is basis. It is the user's responsibility to:
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 ">
                            <li>Verify the correctness of provided phone numbers</li>
                            <li>Use the OTP promptly after reception</li>
                            <li>Enter the OTP correctly at the intended service</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Contact Support</h3>
                        <p >
                            If you experience technical issues unrelated to the circumstances mentioned above, 
                            please contact our support team for assistance.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Data Privacy</CardTitle>
                    <CardDescription>
                        How we handle your personal information
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p >
                        We take the privacy of your data seriously. Our service only collects information 
                        necessary for providing OTP services and managing your account.
                    </p>
                    <p >
                        Phone numbers used for OTP services are handled securely and in accordance 
                        with applicable privacy laws and regulations.
                    </p>
                </CardContent>
            </Card>
        </div>
    </AppLayout>
  )
}

export default Privacy