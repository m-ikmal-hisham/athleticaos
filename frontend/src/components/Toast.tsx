import { useEffect } from 'react';
import { X, CheckCircle, WarningCircle, Info } from '@phosphor-icons/react';
import { clsx } from 'clsx';

interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info';
    duration?: number;
    onClose: () => void;
}

export const Toast = ({ message, type = 'success', duration = 3000, onClose }: ToastProps) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const icons = {
        success: CheckCircle,
        error: WarningCircle,
        info: Info,
    };

    const Icon = icons[type];

    const colors = {
        success: 'bg-green-500/90',
        error: 'bg-red-500/90',
        info: 'bg-blue-500/90',
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
            <div className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm text-white min-w-[300px]',
                colors[type]
            )}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                <p className="flex-1 text-sm font-medium">{message}</p>
                <button
                    onClick={onClose}
                    className="text-white/80 hover:text-white transition-colors"
                    aria-label="Close"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
