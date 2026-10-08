import { ShieldWarning } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/Button';

export const UnauthorizedPage = () => {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-crimson/10 border border-crimson/20 mb-6">
                    <ShieldWarning className="w-8 h-8 text-crimson dark:text-crimson-tint" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
                    Access denied
                </h1>
                <p className="text-muted mb-8 max-w-md text-sm sm:text-base">
                    You don't have permission to access this page. Please contact your administrator if you believe this is an error.
                </p>
                <Link to="/dashboard">
                    <Button variant="primary">
                        Go to dashboard
                    </Button>
                </Link>
            </div>
        </div>
    );
};
