import React from 'react';
import { clsx } from 'clsx';

interface PageHeaderProps {
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export const PageHeader = ({ title, description, action, className }: PageHeaderProps) => {
    return (
        <div className={clsx('flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8', className)}>
            <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground tracking-tight">
                    {title}
                </h1>
                {description && (
                    <p className="mt-1 text-muted text-sm md:text-base">
                        {description}
                    </p>
                )}
            </div>
            {action && (
                <div className="flex-shrink-0">
                    {action}
                </div>
            )}
        </div>
    );
};
