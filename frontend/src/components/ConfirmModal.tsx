import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'primary' | 'destructive'; // Added variant support
}

export const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'primary'
}: ConfirmModalProps) => {

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
        >
            <div className="space-y-6">
                <p className="text-muted-foreground leading-relaxed">
                    {message}
                </p>

                <div className="flex gap-3 justify-end pt-2">
                    <Button
                        variant="cancel"
                        onClick={onClose}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant={variant === 'destructive' ? 'danger' : 'primary'}
                        onClick={handleConfirm}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
