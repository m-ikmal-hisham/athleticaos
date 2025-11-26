import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background is handled by body styles in globals.css */}
            <div className="w-full z-10">
                <Outlet />
            </div>
        </div>
    );
};
