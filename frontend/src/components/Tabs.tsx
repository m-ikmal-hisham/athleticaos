import * as React from "react"
import { clsx } from "clsx"

const TabsContext = React.createContext<{
    value: string;
    onValueChange: (value: string) => void;
} | null>(null);

interface TabsProps {
    defaultValue: string;
    children: React.ReactNode;
    className?: string;
}

export function Tabs({ defaultValue, children, className }: TabsProps) {
    const [value, setValue] = React.useState(defaultValue);

    return (
        <TabsContext.Provider value={{ value, onValueChange: setValue }}>
            <div className={clsx("w-full", className)}>{children}</div>
        </TabsContext.Provider>
    );
}

interface TabsListProps {
    children: React.ReactNode;
    className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
    return (
        <div className={clsx("inline-flex h-10 items-center justify-center rounded-lg bg-black/4 dark:bg-white/6 p-1 text-black/72 dark:text-white/72 border border-black/10 dark:border-white/12", className)}>
            {children}
        </div>
    );
}

interface TabsTriggerProps {
    value: string;
    children: React.ReactNode;
    className?: string;
}

export function TabsTrigger({ value, children, className }: TabsTriggerProps) {
    const context = React.useContext(TabsContext);
    if (!context) throw new Error("TabsTrigger must be used within Tabs");

    const isActive = context.value === value;

    return (
        <button
            className={clsx(
                "inline-flex items-center justify-center whitespace-nowrap rounded-[8px] px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isActive
                    ? "bg-white dark:bg-deep-navy text-navy dark:text-navy-tint shadow-sm font-semibold"
                    : "text-black/72 dark:text-white/72 hover:text-black dark:hover:text-white hover:bg-black/4 dark:hover:bg-white/6",
                className
            )}
            onClick={() => context.onValueChange(value)}
        >
            {children}
        </button>
    );
}

interface TabsContentProps {
    value: string;
    children: React.ReactNode;
    className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
    const context = React.useContext(TabsContext);
    if (!context) throw new Error("TabsContent must be used within Tabs");

    if (context.value !== value) return null;

    return (
        <div className={clsx("mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint focus-visible:ring-offset-2", className)}>
            {children}
        </div>
    );
}
