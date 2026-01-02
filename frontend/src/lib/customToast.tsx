
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
                } max-w-md w-full bg-white dark:bg-slate-900 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 dark:ring-white/10 overflow-hidden relative`}
        >
            {/* Accent Bar */}
            <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${type === 'success' ? 'bg-green-500' :
                    type === 'error' ? 'bg-red-500' :
                        type === 'loading' ? 'bg-blue-500' :
                            'bg-slate-500'
                }`} />

            <div className="flex-1 w-0 p-4 pl-5">
                <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                        {type === 'success' && <CheckCircle className="h-6 w-6 text-green-500" weight="fill" />}
                        {type === 'error' && <WarningCircle className="h-6 w-6 text-red-500" weight="fill" />}
                        {type === 'loading' && <Spinner className="h-6 w-6 text-blue-500 animate-spin" />}
                        {type === 'info' && <Info className="h-6 w-6 text-slate-500" weight="fill" />}
                    </div>
                    <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {message}
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex border-l border-gray-200 dark:border-slate-800">
                <button
                    onClick={() => toast.dismiss(t.id)}
                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
