import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Warning, X, IdentificationCard } from '@phosphor-icons/react';
import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';

export interface PossibleDuplicateMatchItem {
    registrationNo?: string | null;
    firstName: string;
    lastName: string;
}

export interface PossibleDuplicateDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmAnyway: () => void;
    visibleMatches: PossibleDuplicateMatchItem[];
    otherOrganisationsCount?: number;
    isSubmitting?: boolean;
    title?: string;
    confirmButtonText?: string;
}

export const PossibleDuplicateDialog: React.FC<PossibleDuplicateDialogProps> = ({
    isOpen,
    onClose,
    onConfirmAnyway,
    visibleMatches = [],
    otherOrganisationsCount = 0,
    isSubmitting = false,
    title = 'Possible Duplicate Person Detected',
    confirmButtonText = 'Create anyway'
}) => {
    const cancelButtonRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    // Initial focus on Cancel button & Escape key handling
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }

            // Focus trap inside dialog
            if (e.key === 'Tab' && dialogRef.current) {
                const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusableElements.length === 0) return;

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };

        const timer = setTimeout(() => {
            cancelButtonRef.current?.focus();
        }, 50);

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            {/* Elevated backdrop */}
            <div
                className="fixed inset-0 bg-black/70 backdrop-blur-md animate-fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Dialog Container */}
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="possible-duplicate-dialog-title"
                className="relative z-[71] w-full max-w-lg"
            >
                <GlassCard
                    onClick={(e) => e.stopPropagation()}
                    className="p-0 border border-amber-500/30 bg-[#121218]/95 shadow-2xl shadow-amber-950/20 max-h-[90vh] flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-white/10 bg-amber-500/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                                <Warning className="w-6 h-6" />
                            </div>
                            <h2
                                id="possible-duplicate-dialog-title"
                                className="text-lg font-semibold text-foreground"
                            >
                                {title}
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-white/5"
                            aria-label="Close dialog"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto space-y-5 text-sm">
                        <p className="text-muted-foreground leading-relaxed">
                            A person with the same <strong className="text-foreground">name, date of birth, and gender</strong> already exists in the system.
                        </p>

                        {/* Visible matches list */}
                        {visibleMatches.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Existing Matching Record{visibleMatches.length > 1 ? 's' : ''}
                                </div>
                                <div className="border border-white/10 rounded-lg divide-y divide-white/5 bg-white/[0.02] overflow-hidden">
                                    {visibleMatches.map((match, idx) => (
                                        <div
                                            key={`${match.registrationNo || idx}-${match.firstName}-${match.lastName}`}
                                            className="p-3 flex items-center justify-between gap-3"
                                        >
                                            <div className="font-medium text-foreground">
                                                {match.firstName} {match.lastName}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs">
                                                <IdentificationCard className="w-4 h-4 text-muted-foreground" />
                                                <span className={match.registrationNo ? 'font-mono text-primary font-semibold' : 'text-muted-foreground italic'}>
                                                    {match.registrationNo || 'None (Legacy)'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Other organisations notice */}
                        {otherOrganisationsCount > 0 && (
                            <div className="p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-start gap-2.5">
                                <div className="mt-0.5 font-bold">ℹ</div>
                                <div>
                                    <strong>{otherOrganisationsCount}</strong> additional match{otherOrganisationsCount > 1 ? 'es exist' : ' exists'} in other organisations that you do not have permission to view.
                                </div>
                            </div>
                        )}

                        {/* Audit warning callout */}
                        <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-xs leading-relaxed">
                            Proceeding will create a separate person record. This action will be permanently recorded in the system audit log.
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-5 border-t border-white/10 flex items-center justify-end gap-3 bg-white/[0.02]">
                        <Button
                            type="button"
                            variant="cancel"
                            onClick={onClose}
                            ref={cancelButtonRef}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <button
                            type="button"
                            onClick={onConfirmAnyway}
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-amber-600 hover:bg-amber-500 active:bg-amber-700 transition-colors shadow-sm disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {isSubmitting ? 'Processing...' : confirmButtonText}
                        </button>
                    </div>
                </GlassCard>
            </div>
        </div>,
        document.body
    );
};
