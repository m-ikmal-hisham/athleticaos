import { Fragment, ReactNode } from 'react';
import { X } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { GlassCard } from './GlassCard';

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
                className="fixed inset-0 z-50 flex items-center justify-center p-4 fixed inset-0 overflow-y-auto"
            >
                <GlassCard
                    onClick={(e) => e.stopPropagation()}
                    className={clsx(
                        'w-full animate-scale-in my-8 p-0 max-h-[90vh] overflow-y-auto',
                        sizes[size]
                    )}
                >
                    {/* Header */}
                    {title && (
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
                            <button
                                onClick={onClose}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-white/5"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* Content */}
                    <div className={title ? "p-6" : ""}>{children}</div>
                </GlassCard>
            </div>
        </Fragment>
    );
};
