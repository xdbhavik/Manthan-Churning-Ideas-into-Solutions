import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
          <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-xl p-8 max-w-lg w-full text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#FFF1F2] text-[#BE123C] mb-4">
              <span className="material-symbols-outlined text-[24px]">error</span>
            </div>
            <h2 className="text-[18px] font-bold text-[#0A2540] mb-2">Something went wrong</h2>
            <p className="text-[13px] text-[#64748B] mb-6">
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[#0A2540] text-white text-[13px] font-semibold rounded-lg hover:bg-[#1E3A8A] transition-colors"
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={() => { this.setState({ hasError: false, error: null }); }}
                className="px-4 py-2 border border-[#CBD5E1] text-[#0A2540] text-[13px] font-semibold rounded-lg hover:bg-[#F8FAFC] transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
