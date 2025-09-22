'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper, Alert, AlertTitle, Chip } from '@mui/material';
import { 
  ErrorOutline, 
  Refresh, 
  PlayArrow, 
  MemoryOutlined,
  WarningAmber,
  CheckCircleOutline 
} from '@mui/icons-material';

interface Props {
  children: ReactNode;
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
  errorType: 'engine' | 'analysis' | 'component' | 'unknown';
  errorDetails: string;
  canRetry: boolean;
  canContinueWithoutAnalysis: boolean;
}

export default class AnalysisErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'unknown',
      errorDetails: '',
      canRetry: true,
      canContinueWithoutAnalysis: true
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AnalysisErrorBoundary caught an error:', error, errorInfo);
    
    // Analyze the error to provide specific guidance
    const errorAnalysis = this.analyzeError(error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      ...errorAnalysis
    });

    // Report to monitoring if available
    this.reportError(error, errorInfo, errorAnalysis);
  }

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
      canRetry: this.retryCount < this.maxRetries,
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
        timestamp: new Date().toISOString(),
        retryCount: this.retryCount
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

  private handleRetry = () => {
    this.retryCount++;
    
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'unknown',
      errorDetails: '',
      canRetry: true,
      canContinueWithoutAnalysis: true
    });

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

  private handleReloadPage = () => {
    window.location.reload();
  };

  private getErrorIcon() {
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

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { errorType, errorDetails, canRetry, canContinueWithoutAnalysis } = this.state;
    const { engineStatus } = this.props;
    const errorColor = this.getErrorColor();

    return (
      <Box
        sx={{
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          backgroundColor: '#1a1a1a'
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            backgroundColor: '#2a2a2a',
            color: 'white',
            maxWidth: '700px',
            width: '100%'
          }}
        >
          {/* Error Alert */}
          <Alert
            severity="error"
            icon={this.getErrorIcon()}
            sx={{
              backgroundColor: errorColor,
              color: 'white',
              mb: 3,
              '& .MuiAlert-icon': {
                color: 'white'
              }
            }}
          >
            <AlertTitle>Analysis System Error</AlertTitle>
            {errorDetails}
          </Alert>

          {/* Error Type Badge */}
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

          {/* Engine Status */}
          {engineStatus && (
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

          {/* Recovery Options */}
          <Typography variant="h6" sx={{ mb: 2 }}>Recovery Options</Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Retry Analysis */}
            {canRetry && this.retryCount < this.maxRetries && (
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
                Retry Analysis ({this.maxRetries - this.retryCount} attempts remaining)
              </Button>
            )}

            {/* Continue Without Analysis */}
            {canContinueWithoutAnalysis && (
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
              variant="text"
              onClick={this.handleReloadPage}
              sx={{ color: '#888' }}
            >
              Reload Page
            </Button>
          </Box>

          {/* Technical Details for Development */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <Box
              sx={{
                mt: 3,
                p: 2,
                backgroundColor: '#1a1a1a',
                borderRadius: 1,
                border: '1px solid #333'
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#888' }}>
                Technical Details (Development Only)
              </Typography>
              <Typography
                variant="body2"
                component="pre"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  color: '#ff6b6b',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {this.state.error.stack || this.state.error.message}
              </Typography>
            </Box>
          )}

          {/* Help Text */}
          <Typography variant="caption" sx={{ display: 'block', mt: 3, color: '#666' }}>
            If this problem persists, the chess analysis feature may be temporarily unavailable. 
            You can continue using the main game features without analysis.
          </Typography>
        </Paper>
      </Box>
    );
  }
}