import { WarningCircle } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/Button';

export const NotFoundPage = () => {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary-500/20 border border-primary-500/50 mb-6">
                    <WarningCircle className="w-10 h-10 text-primary-400" />
                </div>
                <h1 className="text-6xl font-display font-bold gradient-text mb-4">
                    404
                </h1>
                <h2 className="text-2xl font-semibold text-slate-100 mb-4">
                    Page Not Found
                </h2>
                <p className="text-slate-400 mb-8 max-w-md">
                    The page you're looking for doesn't exist or has been moved.
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
