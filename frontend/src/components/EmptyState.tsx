
import { clsx } from 'clsx';
import { Icon } from '@phosphor-icons/react';
import { Button } from './Button';

interface EmptyStateProps {
    icon: Icon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    className
}: EmptyStateProps) {
    return (
        <div className={clsx(
            "flex flex-col items-center justify-center py-24 px-4 text-center rounded-2xl",
            "bg-white/5 border border-white/10 border-dashed",
            className
        )}>
            <div className="p-4 bg-white/5 rounded-full mb-4 ring-1 ring-white/10">
                <Icon className="w-8 h-8 text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
                {title}
            </h3>
            <p className="text-sm text-muted max-w-sm mb-6">
                {description}
            </p>
            {actionLabel && onAction && (
                <Button onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
