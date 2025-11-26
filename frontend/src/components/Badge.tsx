import { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'secondary' | 'destructive';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className, variant = 'default', ...props }, ref) => {
        const variants = {
            default: 'bg-green-500/20 text-green-300 border-green-500/30',
            success: 'bg-green-500/20 text-green-300 border-green-500/30',
            warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
            danger: 'bg-red-500/20 text-red-300 border-red-500/30',
            destructive: 'bg-red-500/20 text-red-300 border-red-500/30',
            info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
            primary: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
            secondary: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
        };

        return (
            <span
                ref={ref}
                className={clsx(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border backdrop-blur-sm',
                    variants[variant],
                    className
                )}
                {...props}
            />
        );
    }
);

Badge.displayName = 'Badge';
