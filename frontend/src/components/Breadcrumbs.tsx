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
}

export const Breadcrumbs = ({ items, className }: BreadcrumbsProps) => {
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

    return (
        <nav aria-label="Breadcrumb" className={cn("w-full", className)}>
            {/* Mobile View: Simple Back Link */}
            <div className="flex md:hidden">
                <Link
                    to={backPath}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{backLabel}</span>
                </Link>
            </div>

            {/* Desktop View: Full Breadcrumbs */}
            <ol className="hidden md:flex items-center space-x-2">
                <li>
                    <Link
                        to={homePath}
                        className="text-muted-foreground hover:text-foreground transition-colors flex items-center"
                    >
                        <House className="w-4 h-4" />
                    </Link>
                </li>

                {items.map((item, index) => {
                    const isLast = index === items.length - 1;

                    return (
                        <li key={index} className="flex items-center space-x-2">
                            <CaretRight className="w-4 h-4 text-muted-foreground/50" />
                            {isLast ? (
                                <span className="text-sm font-medium text-foreground">
                                    {item.label}
                                </span>
                            ) : (
                                <Link
                                    to={item.path || '#'}
                                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
