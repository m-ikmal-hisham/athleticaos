import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
                    <div className="max-w-xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 border border-red-200 dark:border-red-900">
                        <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
                            Something went wrong
                        </h1>
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md mb-6 overflow-auto">
                            <p className="font-mono text-sm text-red-800 dark:text-red-200 break-all">
                                {this.state.error && this.state.error.toString()}
                            </p>
                        </div>

                        <details className="mb-6">
                            <summary className="cursor-pointer text-gray-600 dark:text-gray-400 font-medium mb-2">
                                Stack Trace
                            </summary>
                            <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-4 rounded overflow-auto h-48 text-gray-700 dark:text-gray-300">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </details>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
