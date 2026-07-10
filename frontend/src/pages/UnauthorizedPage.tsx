import { ShieldWarning } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/Button';

export const UnauthorizedPage = () => {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/20 border border-red-500/50 mb-6">
                    <ShieldWarning className="w-10 h-10 text-red-400" />
                </div>
                <h1 className="text-4xl font-display font-bold text-slate-100 mb-4">
                    Access Denied
                </h1>
                <p className="text-slate-400 mb-8 max-w-md">
                    You don't have permission to access this page. Please contact your administrator if you believe this is an error.
                </p>
                <Link to="/dashboard">
                    <Button variant="primary">
                        Go to Dashboard
                    </Button>
                </Link>
            </div>
        </div>
    );
};
