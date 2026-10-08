import { Fragment, ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import { clsx } from 'clsx';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }: ModalProps) => {
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented) return;
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return createPortal(
        <Fragment>
            {/* Backdrop (scrim blur permitted per STYLE_GUIDE) */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
                onClick={onClose}
            />

            {/* Modal Dialog */}
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className={clsx(
                        'w-full animate-scale-in my-8 p-0 max-h-[90vh] overflow-y-auto bg-surface-card border border-line-subtle rounded-[20px] shadow-lg text-content-primary',
                        sizes[size]
                    )}
                >
                    {/* Header */}
                    {title && (
                        <div className="flex items-center justify-between p-6 border-b border-line-subtle">
                            <h2 className="text-xl font-semibold text-black dark:text-white">{title}</h2>
                            <button
                                type="button"
                                onClick={onClose}
                                className="text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors p-1.5 rounded-lg hover:bg-black/4 dark:hover:bg-white/6"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* Content */}
                    <div className={title ? "p-6" : ""}>{children}</div>
                </div>
            </div>
        </Fragment>,
        document.body
    );
};
