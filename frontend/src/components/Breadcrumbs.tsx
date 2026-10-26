import { Link, useLocation } from 'react-router-dom';
import { CaretRight, House, ArrowLeft } from '@phosphor-icons/react';
import { cn } from '@/lib/theme-utils';

export interface BreadcrumbItem {
    label: string;
    path?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
    className?: string;
    variant?: 'default' | 'on-dark';
    showMobileBack?: boolean;
}

export const Breadcrumbs = ({
    items,
    className,
    variant = 'default',
    showMobileBack = true,
}: BreadcrumbsProps) => {
    const location = useLocation();
    const isDashboard = location.pathname.startsWith('/dashboard');
    const homePath = isDashboard ? '/dashboard' : '/';

    // Determine parent for mobile "Back" button
    const parentItem = items.length > 1
        ? items[items.length - 2]
        : null;

    // If we have items, the back path is either the second-to-last item, or Home if only 1 item exists
    const backPath = parentItem?.path || homePath;
    const backLabel = parentItem?.label || 'Home';

    const isOnDark = variant === 'on-dark';

    return (
        <nav aria-label="Breadcrumb" className={cn("w-full", className)}>
            {/* Mobile View: Simple Back Link (Admin only below lg; Public uses PublicLayout Back row) */}
            {showMobileBack && (
                <div className="flex lg:hidden">
                    <Link
                        to={backPath}
                        className={cn(
                            "flex items-center gap-2 text-sm font-medium transition-colors",
                            isOnDark
                                ? "text-white/80 hover:text-white"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>{backLabel}</span>
                    </Link>
                </div>
            )}

            {/* Desktop View (lg up): Full Breadcrumbs */}
            <ol className="hidden lg:flex items-center space-x-2">
                <li>
                    <Link
                        to={homePath}
                        className={cn(
                            "transition-colors flex items-center",
                            isOnDark
                                ? "text-white/75 hover:text-white"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <House className="w-4 h-4" />
                    </Link>
                </li>

                {items.map((item, index) => {
                    const isLast = index === items.length - 1;

                    return (
                        <li key={index} className="flex items-center space-x-2">
                            <CaretRight
                                className={cn(
                                    "w-4 h-4",
                                    isOnDark ? "text-white/40" : "text-muted-foreground/50"
                                )}
                            />
                            {isLast ? (
                                <span
                                    className={cn(
                                        "text-sm font-semibold",
                                        isOnDark ? "text-white" : "text-foreground font-medium"
                                    )}
                                >
                                    {item.label}
                                </span>
                            ) : (
                                <Link
                                    to={item.path || '#'}
                                    className={cn(
                                        "text-sm transition-colors",
                                        isOnDark
                                            ? "text-white/75 hover:text-white underline-offset-2 hover:underline decoration-white/40"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {item.label}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};
