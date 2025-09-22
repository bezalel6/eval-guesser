'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper, Alert, AlertTitle, Collapse, Chip } from '@mui/material';
import { 
  ErrorOutline, 
  Refresh, 
  BugReport, 
  PlayArrow, 
  MemoryOutlined,
  WarningAmber,
  CheckCircleOutline 
} from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  // Analysis-specific props
  analysisMode?: boolean;
  onRetryAnalysis?: () => void;
  onContinueWithoutAnalysis?: () => void;
  engineStatus?: {
    isInitialized: boolean;
    isInitializing: boolean;
    initializationError: string | null;
  };
  analysisContext?: {
    currentFen?: string;
    isAnalyzing?: boolean;
    lastError?: string;
  };
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  showDetails: boolean;
  // Analysis-specific state
  errorType: 'engine' | 'analysis' | 'component' | 'unknown';
  errorDetails: string;
  canRetry: boolean;
  canContinueWithoutAnalysis: boolean;
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
      showDetails: false,
      errorType: 'unknown',
      errorDetails: '',
      canRetry: true,
      canContinueWithoutAnalysis: true
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
    
    // Analyze the error for specific context if in analysis mode
    const errorAnalysis = this.props.analysisMode ? this.analyzeError(error, errorInfo) : {
      errorType: 'unknown' as const,
      errorDetails: error.message || 'An unexpected error occurred',
      canRetry: true,
      canContinueWithoutAnalysis: false
    };
    
    this.setState({
      error,
      errorInfo,
      ...errorAnalysis
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Enhanced error reporting for analysis mode
    this.reportError(error, errorInfo, errorAnalysis);
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
      showDetails: false,
      errorType: 'unknown',
      errorDetails: '',
      canRetry: true,
      canContinueWithoutAnalysis: true
    });
  };

  // Analysis error analysis methods (from AnalysisErrorBoundary)
  private analyzeError(error: Error, errorInfo: ErrorInfo) {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    const componentStack = errorInfo.componentStack.toLowerCase();

    // Engine-related errors
    if (message.includes('stockfish') || 
        message.includes('engine') || 
        message.includes('worker') ||
        stack.includes('stockfish') ||
        componentStack.includes('stockfish')) {
      
      return {
        errorType: 'engine' as const,
        errorDetails: this.getEngineErrorDetails(error),
        canRetry: true,
        canContinueWithoutAnalysis: true
      };
    }

    // Analysis-related errors
    if (message.includes('analysis') || 
        message.includes('fen') ||
        message.includes('position') ||
        message.includes('chess') ||
        stack.includes('chess.js')) {
      
      return {
        errorType: 'analysis' as const,
        errorDetails: this.getAnalysisErrorDetails(error),
        canRetry: true,
        canContinueWithoutAnalysis: true
      };
    }

    // Component rendering errors
    if (componentStack.includes('analysisboard') || 
        componentStack.includes('analysissidebar') ||
        message.includes('render') ||
        message.includes('hook')) {
      
      return {
        errorType: 'component' as const,
        errorDetails: this.getComponentErrorDetails(error),
        canRetry: true,
        canContinueWithoutAnalysis: false
      };
    }

    // Unknown error type
    return {
      errorType: 'unknown' as const,
      errorDetails: 'An unexpected error occurred in the analysis system.',
      canRetry: true,
      canContinueWithoutAnalysis: true
    };
  }

  private getEngineErrorDetails(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('worker')) {
      return 'The Stockfish chess engine failed to load. This may be due to network issues or browser compatibility problems.';
    }
    
    if (message.includes('initialization') || message.includes('timeout')) {
      return 'The chess engine is taking longer than expected to initialize. This may be due to system resources or network connectivity.';
    }
    
    if (message.includes('communication')) {
      return 'Communication with the chess engine was interrupted. The engine may have stopped responding.';
    }
    
    if (message.includes('destroyed')) {
      return 'The chess engine was unexpectedly terminated. A restart may be required.';
    }
    
    return 'The Stockfish chess engine encountered an error and cannot continue analysis.';
  }

  private getAnalysisErrorDetails(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('fen') || message.includes('position')) {
      return 'The current chess position is invalid or corrupted. Please reset the board to continue.';
    }
    
    if (message.includes('move')) {
      return 'A chess move could not be processed correctly. This may be due to an invalid position state.';
    }
    
    if (message.includes('timeout')) {
      return 'Analysis is taking longer than expected. The position may be too complex or the engine is overloaded.';
    }
    
    return 'The analysis process encountered an error while evaluating the current position.';
  }

  private getComponentErrorDetails(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('hook')) {
      return 'A React component hook encountered an error. This may be due to component state issues.';
    }
    
    if (message.includes('render')) {
      return 'A component failed to render properly. This may be due to invalid props or state.';
    }
    
    return 'A user interface component encountered an error and could not display correctly.';
  }

  private reportError(error: Error, errorInfo: ErrorInfo, analysis: Record<string, unknown>) {
    // Enhanced error reporting with context
    const report = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo,
      analysis,
      context: {
        ...this.props.analysisContext,
        engineStatus: this.props.engineStatus,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
        timestamp: new Date().toISOString()
      }
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('Analysis Error Report');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Analysis:', analysis);
      console.error('Context:', report.context);
      console.groupEnd();
    }

    // Report to external service if available
    if (typeof window !== 'undefined' && (window as unknown as { reportError?: (report: unknown) => void }).reportError) {
      (window as unknown as { reportError: (report: unknown) => void }).reportError(report);
    }
  }

  handleRetry = () => {
    // Add a small delay to prevent immediate re-error
    this.resetTimeoutId = window.setTimeout(() => {
      this.resetErrorBoundary();
    }, 100);
  };

  // Analysis-specific handlers
  private handleRetryAnalysis = () => {
    this.resetErrorBoundary();
    
    // Call specific retry handler if provided
    if (this.props.onRetryAnalysis) {
      this.props.onRetryAnalysis();
    }
  };

  private handleContinueWithoutAnalysis = () => {
    // Navigate back to main app or provide fallback
    if (this.props.onContinueWithoutAnalysis) {
      this.props.onContinueWithoutAnalysis();
    } else {
      // Default: go back to main game
      window.history.back();
    }
  };

  private getErrorIcon() {
    if (!this.props.analysisMode) return <ErrorOutline />;
    
    switch (this.state.errorType) {
      case 'engine':
        return <MemoryOutlined />;
      case 'analysis':
        return <WarningAmber />;
      case 'component':
        return <ErrorOutline />;
      default:
        return <ErrorOutline />;
    }
  }

  private getErrorColor() {
    if (!this.props.analysisMode) return '#f44336';
    
    switch (this.state.errorType) {
      case 'engine':
        return '#ff9800'; // Orange for engine issues
      case 'analysis':
        return '#f44336'; // Red for analysis issues
      case 'component':
        return '#9c27b0'; // Purple for component issues
      default:
        return '#f44336'; // Red for unknown
    }
  }

  toggleDetails = () => {
    this.setState(prev => ({
      showDetails: !prev.showDetails
    }));
  };

  render() {
    if (this.state.hasError) {
      const { fallback, enableRetry = true, analysisMode, engineStatus } = this.props;
      const { error, errorInfo, errorId, showDetails, errorType, errorDetails, canRetry, canContinueWithoutAnalysis } = this.state;

      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      const isDevelopment = process.env.NODE_ENV === 'development';
      const errorColor = this.getErrorColor();

      return (
        <Box
          sx={{
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: analysisMode ? '400px' : '200px',
            textAlign: 'center',
            backgroundColor: '#1a1a1a'
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: analysisMode ? 4 : 3,
              backgroundColor: '#2a2a2a',
              color: 'white',
              maxWidth: analysisMode ? '700px' : '600px',
              width: '100%'
            }}
          >
            <Alert
              severity="error"
              icon={this.getErrorIcon()}
              sx={{
                backgroundColor: errorColor,
                color: 'white',
                mb: analysisMode ? 3 : 2,
                '& .MuiAlert-icon': {
                  color: 'white'
                }
              }}
            >
              <AlertTitle>{analysisMode ? 'Analysis System Error' : 'Something went wrong'}</AlertTitle>
              {analysisMode ? errorDetails : 'An unexpected error occurred. The application encountered a problem and couldn\'t continue.'}
            </Alert>

            {/* Error Type Badge for Analysis Mode */}
            {analysisMode && (
              <Box sx={{ mb: 3 }}>
                <Chip
                  label={`${errorType.toUpperCase()} ERROR`}
                  sx={{
                    backgroundColor: errorColor,
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
              </Box>
            )}

            {/* Engine Status for Analysis Mode */}
            {analysisMode && engineStatus && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>Engine Status</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    icon={engineStatus.isInitialized ? <CheckCircleOutline /> : <ErrorOutline />}
                    label={engineStatus.isInitialized ? 'Ready' : 'Not Ready'}
                    color={engineStatus.isInitialized ? 'success' : 'error'}
                    variant="outlined"
                  />
                  {engineStatus.isInitializing && (
                    <Chip
                      label="Initializing..."
                      color="warning"
                      variant="outlined"
                    />
                  )}
                  {engineStatus.initializationError && (
                    <Chip
                      label="Init Failed"
                      color="error"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>
            )}

            {/* Error message for standard mode */}
            {!analysisMode && (
              <Typography variant="body1" sx={{ mb: 2, color: '#ccc' }}>
                {error?.message || 'An unknown error occurred'}
              </Typography>
            )}

            {/* Recovery Options */}
            <Typography variant="h6" sx={{ mb: 2 }}>
              {analysisMode ? 'Recovery Options' : 'Actions'}
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Analysis Mode Retry */}
              {analysisMode && canRetry && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Refresh />}
                  onClick={this.handleRetryAnalysis}
                  sx={{
                    backgroundColor: '#1976d2',
                    '&:hover': {
                      backgroundColor: '#1565c0'
                    }
                  }}
                >
                  Retry Analysis
                </Button>
              )}

              {/* Standard Mode Retry */}
              {!analysisMode && enableRetry && (
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

              {/* Continue Without Analysis */}
              {analysisMode && canContinueWithoutAnalysis && (
                <Button
                  variant="outlined"
                  startIcon={<PlayArrow />}
                  onClick={this.handleContinueWithoutAnalysis}
                  sx={{
                    color: 'white',
                    borderColor: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'white'
                    }
                  }}
                >
                  Continue Without Analysis
                </Button>
              )}

              {/* Reload Page */}
              <Button
                variant={analysisMode ? "text" : "outlined"}
                onClick={() => window.location.reload()}
                sx={{
                  color: analysisMode ? '#888' : 'white',
                  ...(analysisMode ? {} : {
                    borderColor: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'white'
                    }
                  })
                }}
              >
                Reload Page
              </Button>
            </Box>

            {/* Development Details */}
            {isDevelopment && (
              <>
                <Button
                  variant="text"
                  size="small"
                  startIcon={<BugReport />}
                  onClick={this.toggleDetails}
                  sx={{ color: '#888', mb: 1, mt: 2 }}
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

            {/* Help Text */}
            <Typography variant="caption" sx={{ display: 'block', mt: 3, color: '#666' }}>
              {analysisMode 
                ? 'If this problem persists, the chess analysis feature may be temporarily unavailable. You can continue using the main game features without analysis.'
                : 'If this problem persists, please refresh the page or contact support.'
              }
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