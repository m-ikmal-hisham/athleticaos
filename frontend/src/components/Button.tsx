import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'cancel' | 'tertiary';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={clsx(
                    'btn inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-300',
                    variant === 'primary' && 'bg-gradient-to-r from-blue-600 to-red-600 text-white shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-red-700 hover:shadow-xl hover:shadow-blue-500/30',
                    variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                    variant === 'outline' && 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
                    variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
                    variant === 'danger' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                    variant === 'cancel' && 'text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl',
                    variant === 'tertiary' && 'backdrop-blur-sm bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-700/80 hover:text-slate-900 dark:hover:text-slate-100 shadow-sm',
                    size === 'sm' && 'h-9 px-3 text-xs',
                    size === 'md' && 'h-10 px-4 py-2',
                    size === 'lg' && 'h-11 px-8',
                    (disabled || isLoading) && 'opacity-50 cursor-not-allowed',
                    className
                )}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                )}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
