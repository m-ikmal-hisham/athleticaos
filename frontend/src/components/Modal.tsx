import { Fragment, ReactNode } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }: ModalProps) => {
    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return (
        <Fragment>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ position: 'fixed', overflowY: 'auto' }}
            >
                <div
                    className={clsx(
                        'glass-card w-full animate-scale-in my-8',
                        sizes[size]
                    )}
                    onClick={(e) => e.stopPropagation()}
                    style={{ maxHeight: '90vh', overflowY: 'auto' }}
                >
                    {/* Header */}
                    {title && (
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
                            <button
                                onClick={onClose}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-white/5"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* Content */}
                    <div>{children}</div>
                </div>
            </div>
        </Fragment>
    );
};
