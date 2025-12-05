
interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
}

export const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
}: ConfirmModalProps) => {
    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="glass-card w-full max-w-md animate-scale-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
                    <p className="text-muted-foreground mb-6">{message}</p>

                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors text-foreground font-medium"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="px-4 py-2 btn-primary rounded-lg font-medium transition-colors text-white bg-primary hover:bg-primary/90"
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
