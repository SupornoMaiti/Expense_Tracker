import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
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

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px] gap-4">
          <div className="p-3 rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">Something went wrong</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              {this.state.error?.message || 'An unexpected error occurred while rendering this view.'}
            </p>
          </div>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={this.handleReset}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Try Again
            </Button>
            <Button variant="default" size="sm" onClick={() => window.location.reload()}>
              Reload App
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
