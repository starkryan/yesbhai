import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

export default function Dashboard() {
    const { success, error, info, warning, promise } = useToast();

    const handleSuccess = () => success('Operation completed successfully');
    const handleError = () => error('Something went wrong!');
    const handleInfo = () => info('Here is some information for you');
    const handleWarning = () => warning('Be careful with this action');
    
    const handlePromise = () => {
        const fakeFetch = new Promise((resolve, reject) => {
            setTimeout(() => {
                // Random success or failure
                Math.random() > 0.5 ? resolve({ data: 'Success data' }) : reject(new Error('Failed to fetch'));
            }, 2000);
        });
        
        promise(fakeFetch, {
            loading: 'Loading data...',
            success: (data) => `Data loaded successfully`,
            error: (err) => `Error: ${err.message}`
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border p-6">
                    <h2 className="mb-4 text-xl font-semibold">Toast Notification Examples</h2>
                    <div className="flex flex-wrap gap-3">
                        <Button onClick={handleSuccess} variant="default">Success Toast</Button>
                        <Button onClick={handleError} variant="destructive">Error Toast</Button>
                        <Button onClick={handleInfo} variant="secondary">Info Toast</Button>
                        <Button onClick={handleWarning} variant="outline">Warning Toast</Button>
                        <Button onClick={handlePromise} variant="default">Promise Toast</Button>
                    </div>
                </div>
            
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                </div>
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                </div>
            </div>
        </AppLayout>
    );
}
