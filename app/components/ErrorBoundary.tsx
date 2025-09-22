'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper, Alert, AlertTitle, Collapse } from '@mui/material';
import { ErrorOutline, Refresh, BugReport } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  showDetails: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error monitoring service if available
    if (typeof window !== 'undefined' && (window as unknown as { reportError?: (error: Error) => void }).reportError) {
      (window as unknown as { reportError: (error: Error) => void }).reportError(error);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }

    if (hasError && resetKeys) {
      const prevResetKeys = prevProps.resetKeys || [];
      const hasResetKeyChanged = resetKeys.some((key, index) => key !== prevResetKeys[index]);
      
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      showDetails: false
    });
  };

  handleRetry = () => {
    // Add a small delay to prevent immediate re-error
    this.resetTimeoutId = window.setTimeout(() => {
      this.resetErrorBoundary();
    }, 100);
  };

  toggleDetails = () => {
    this.setState(prev => ({
      showDetails: !prev.showDetails
    }));
  };

  render() {
    if (this.state.hasError) {
      const { fallback, enableRetry = true } = this.props;
      const { error, errorInfo, errorId, showDetails } = this.state;

      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <Box
          sx={{
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '200px',
            textAlign: 'center',
            backgroundColor: '#1a1a1a'
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 3,
              backgroundColor: '#2a2a2a',
              color: 'white',
              maxWidth: '600px',
              width: '100%'
            }}
          >
            <Alert
              severity="error"
              icon={<ErrorOutline />}
              sx={{
                backgroundColor: '#d32f2f',
                color: 'white',
                mb: 2,
                '& .MuiAlert-icon': {
                  color: 'white'
                }
              }}
            >
              <AlertTitle>Something went wrong</AlertTitle>
              An unexpected error occurred. The application encountered a problem and couldn't continue.
            </Alert>

            <Typography variant="body1" sx={{ mb: 2, color: '#ccc' }}>
              {error?.message || 'An unknown error occurred'}
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 2 }}>
              {enableRetry && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Refresh />}
                  onClick={this.handleRetry}
                  sx={{
                    backgroundColor: '#1976d2',
                    '&:hover': {
                      backgroundColor: '#1565c0'
                    }
                  }}
                >
                  Try Again
                </Button>
              )}
              
              <Button
                variant="outlined"
                onClick={() => window.location.reload()}
                sx={{
                  color: 'white',
                  borderColor: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'white'
                  }
                }}
              >
                Reload Page
              </Button>
            </Box>

            {isDevelopment && (
              <>
                <Button
                  variant="text"
                  size="small"
                  startIcon={<BugReport />}
                  onClick={this.toggleDetails}
                  sx={{ color: '#888', mb: 1 }}
                >
                  {showDetails ? 'Hide' : 'Show'} Error Details
                </Button>

                <Collapse in={showDetails}>
                  <Box
                    sx={{
                      backgroundColor: '#1a1a1a',
                      p: 2,
                      borderRadius: 1,
                      mt: 2,
                      border: '1px solid #333'
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mb: 1,
                        color: '#888',
                        fontFamily: 'monospace'
                      }}
                    >
                      Error ID: {errorId}
                    </Typography>
                    
                    <Typography
                      variant="body2"
                      component="pre"
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        color: '#ff6b6b',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        mb: 2
                      }}
                    >
                      {error?.stack || error?.message || 'No error details available'}
                    </Typography>

                    {errorInfo && (
                      <Typography
                        variant="body2"
                        component="pre"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          color: '#ffa726',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}
                      >
                        Component Stack:
                        {errorInfo.componentStack}
                      </Typography>
                    )}
                  </Box>
                </Collapse>
              </>
            )}

            <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#666' }}>
              If this problem persists, please refresh the page or contact support.
            </Typography>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}


// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Helper hook for functional components to trigger error boundary  
export function useErrorHandler() {
  return React.useCallback((error: Error, _errorInfo?: Record<string, unknown>) => {
    // This will cause the error boundary to catch it
    throw error;
  }, []);
}