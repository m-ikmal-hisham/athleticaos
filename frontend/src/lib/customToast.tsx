import toast, { Toast } from 'react-hot-toast';
import { CheckCircle, WarningCircle, Info, Spinner } from '@phosphor-icons/react';
import { ReactNode } from 'react';

// Custom Toast Component
const CustomToast = ({
    t,
    type,
    message
}: {
    t: Toast;
    type: 'success' | 'error' | 'loading' | 'info';
    message: string | ReactNode
}) => {
    return (
        <div
            className={`${t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-surface-card border border-line-subtle shadow-md rounded-[10px] pointer-events-auto flex overflow-hidden relative text-content-primary`}
        >
            {/* Accent Bar */}
            <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${type === 'success' ? 'bg-navy' :
                type === 'error' ? 'bg-crimson' :
                    type === 'loading' ? 'bg-navy' :
                        'bg-black/24 dark:bg-white/28'
                }`} />

            <div className="flex-1 w-0 p-4 pl-5">
                <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                        {type === 'success' && <CheckCircle className="h-6 w-6 text-navy dark:text-navy-tint" />}
                        {type === 'error' && <WarningCircle className="h-6 w-6 text-crimson dark:text-crimson-tint" />}
                        {type === 'loading' && <Spinner className="h-6 w-6 text-navy dark:text-navy-tint animate-spin" />}
                        {type === 'info' && <Info className="h-6 w-6 text-black/60 dark:text-white/60" />}
                    </div>
                    <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-black/90 dark:text-white/92">
                            {message}
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex border-l border-line-subtle">
                <button
                    onClick={() => toast.dismiss(t.id)}
                    className="w-full border-0 p-4 flex items-center justify-center text-sm font-medium text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/4 dark:hover:bg-white/6 focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-navy-tint"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

export const showToast = {
    success: (message: string | ReactNode) => {
        toast.custom((t) => <CustomToast t={t} type="success" message={message} />);
    },
    error: (message: string | ReactNode) => {
        toast.custom((t) => <CustomToast t={t} type="error" message={message} />);
    },
    loading: (message: string | ReactNode) => {
        return toast.custom((t) => <CustomToast t={t} type="loading" message={message} />);
    },
    info: (message: string | ReactNode) => {
        toast.custom((t) => <CustomToast t={t} type="info" message={message} />);
    },
    dismiss: (id?: string) => toast.dismiss(id)
};
