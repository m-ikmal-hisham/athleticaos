import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/routes/AppRoutes'
import '@/styles/globals.css'
import { useUIStore } from "@/store/ui.store";
import { Toaster } from 'react-hot-toast';

const Root = () => {
    const { theme, getEffectiveTheme } = useUIStore();

    useEffect(() => {
        const effectiveTheme = getEffectiveTheme();
        document.documentElement.setAttribute("data-theme", effectiveTheme);
    }, [theme, getEffectiveTheme]);

    return (
        <>
            <RouterProvider router={router} />
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: 'var(--glass-bg)',
                        color: 'var(--text-color)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(24px)',
                    },
                }}
            />
        </>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Root />
    </React.StrictMode>,
)
