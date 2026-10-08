import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/routes/AppRoutes'
import '@/styles/globals.css'
import { useUIStore } from "@/store/ui.store";
import { useAuthStore } from '@/store/auth.store';
import { Toaster } from 'react-hot-toast';
import { IconContext } from '@phosphor-icons/react';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from '@/components/ErrorBoundary';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            retryDelay: (attemptIndex) => (attemptIndex === 0 ? 1000 : 3000),
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
        },
    },
});

export const Root = () => {
    const { theme, getEffectiveTheme } = useUIStore();

    useEffect(() => {
        const effectiveTheme = getEffectiveTheme();
        document.documentElement.setAttribute("data-theme", effectiveTheme);
    }, [theme, getEffectiveTheme]);

    // Check token validity on app start (once)
    useEffect(() => {
        useAuthStore.getState().checkTokenValidity();
    }, []);

    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <HelmetProvider>
                    <IconContext.Provider value={{ weight: "duotone" }}>
                        <RouterProvider router={router} />
                        <Toaster
                            position="top-right"
                            toastOptions={{
                                duration: 4000,
                                style: {
                                    background: 'var(--surface-card)',
                                    color: 'var(--content-primary)',
                                    border: '1px solid var(--line-subtle)',
                                    borderRadius: '10px',
                                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                                },
                            }}
                        />
                    </IconContext.Provider>
                </HelmetProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Root />
    </React.StrictMode>,
)
