import { twMerge } from "tailwind-merge";

interface LoadingSpinnerProps {
    className?: string;
    fullScreen?: boolean;
    label?: string;
}

export const LoadingSpinner = ({ className, fullScreen = false, label = "Loading..." }: LoadingSpinnerProps) => {
    return (
        <div className={twMerge(
            "flex flex-col items-center justify-center gap-4 p-8",
            fullScreen && "min-h-[60vh]",
            className
        )}>
            <div className="relative">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            {label && <p className="text-sm font-medium text-muted-foreground animate-pulse">{label}</p>}
        </div>
    );
};
