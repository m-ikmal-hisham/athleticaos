import { ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/store/ui.store';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    /** Accessible label for the close button */
    closeLabel?: string;
    /** Extra classes on the outer layer (e.g. 'lg:hidden', print-hide classes) */
    className?: string;
}

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Bottom sheet for phones and portrait tablets.
 * Portalled to document.body (z-50) so it sits above the bottom bar (z-30) and any
 * stacking context inside <main>. Escape / scrim close, focus moved in and returned.
 */
export function BottomSheet({ isOpen, onClose, title, children, closeLabel, className }: BottomSheetProps) {
    const { t } = useTranslation();
    const resolvedCloseLabel = closeLabel ?? t('dialog.close');
    const sheetRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!isOpen) return;

        const { incrementOverlayCount, decrementOverlayCount } = useUIStore.getState();
        incrementOverlayCount();

        const previouslyFocused = document.activeElement as HTMLElement | null;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        // Move focus into the sheet
        const focusTimer = window.setTimeout(() => {
            const first = sheetRef.current?.querySelector<HTMLElement>(FOCUSABLE);
            (first ?? sheetRef.current)?.focus();
        }, 0);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCloseRef.current();
                return;
            }
            // Keep Tab inside the sheet
            if (e.key === 'Tab' && sheetRef.current) {
                const items = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
                if (items.length === 0) return;
                const first = items[0];
                const last = items[items.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            decrementOverlayCount();
            window.clearTimeout(focusTimer);
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = originalOverflow;
            // Return focus to whatever opened the sheet; preventScroll so a selection that
            // scrolls the page (e.g. jumping to a legal section) is not undone
            if (previouslyFocused && document.contains(previouslyFocused)) {
                previouslyFocused.focus({ preventScroll: true });
            }
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className={clsx('fixed inset-0 z-50', className)}>
            {/* Scrim */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm motion-safe:animate-fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sheet */}
            <div
                ref={sheetRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="fixed inset-x-0 bottom-0 flex flex-col max-h-[80dvh] bg-surface-card border-t border-line-subtle rounded-t-[20px] shadow-lg pb-[calc(env(safe-area-inset-bottom,0px)+16px)] outline-none motion-safe:animate-slide-up"
            >
                <div className="flex items-center justify-between px-4 pt-3 pb-3 border-b border-line-subtle shrink-0">
                    <h2 id={titleId} className="text-base font-semibold text-content-primary">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-w-[44px] min-h-[44px] -mr-2 inline-flex items-center justify-center rounded-[10px] text-content-secondary hover:text-content-primary hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint"
                        aria-label={resolvedCloseLabel}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto px-2 pt-2">{children}</div>
            </div>
        </div>,
        document.body
    );
}
