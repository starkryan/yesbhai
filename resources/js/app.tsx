import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { initializeTheme, useAppearance } from './hooks/use-appearance';
import { Toaster } from 'sonner'

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Create a component for Toaster to use the theme
function AppToaster() {
    const { appearance } = useAppearance();
    return <Toaster position="top-right" richColors theme={appearance} />;
}

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <>
                <App {...props} />
                <AppToaster />
            </>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
