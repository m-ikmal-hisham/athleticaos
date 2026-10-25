import { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    hover?: boolean;
    surface?: 'solid' | 'glass';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className, hover = false, surface = 'solid', children, ...props }, ref) => {
        const isGlass = surface === 'glass';
        return (
            <div
                ref={ref}
                data-no-kick
                className={clsx(
                    isGlass
                        ? 'glass-card-surface p-6 text-content-primary'
                        : 'bg-surface-card border border-line-subtle rounded-[14px] p-6 text-content-primary',
                    hover && (isGlass ? 'glass-card-interactive cursor-pointer' : 'hover:bg-black/4 dark:hover:bg-white/6 transition-colors cursor-pointer'),
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={clsx('mb-4', className)} {...props} />
    )
);

CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h3 ref={ref} className={clsx('text-xl font-semibold text-content-primary', className)} {...props} />
    )
);

CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => (
        <p ref={ref} className={clsx('text-sm text-black/72 dark:text-white/72 mt-1', className)} {...props} />
    )
);

CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={clsx(className)} {...props} />
    )
);

CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={clsx('mt-4 pt-4 border-t border-line-subtle', className)} {...props} />
    )
);

CardFooter.displayName = 'CardFooter';
