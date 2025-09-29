'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import { Warning as WarningIcon, Refresh as RefreshIcon } from '@mui/icons-material';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export default class EngineErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Engine Error Boundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <Paper sx={{ p: 3, m: 2, textAlign: 'center' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <WarningIcon color="error" sx={{ fontSize: 48 }} />

                        <Typography variant="h5" color="error">
                            Engine Error
                        </Typography>

                        <Typography variant="body1" color="text.secondary">
                            The chess engine encountered an error and needs to be restarted.
                        </Typography>

                        {this.state.error && (
                            <Alert severity="error" sx={{ width: '100%', maxWidth: 500 }}>
                                <Typography variant="body2">
                                    {this.state.error.message}
                                </Typography>
                            </Alert>
                        )}

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button
                                variant="contained"
                                startIcon={<RefreshIcon />}
                                onClick={this.handleReset}
                            >
                                Restart Engine
                            </Button>

                            <Button
                                variant="outlined"
                                onClick={() => window.location.reload()}
                            >
                                Reload Page
                            </Button>
                        </Box>

                        {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                            <Box sx={{ mt: 2, width: '100%', maxWidth: 600 }}>
                                <Typography variant="h6" gutterBottom>
                                    Error Details (Development)
                                </Typography>
                                <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', overflow: 'auto' }}>
                                    <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
                                        {this.state.error && this.state.error.stack}
                                        {this.state.errorInfo.componentStack}
                                    </Typography>
                                </Paper>
                            </Box>
                        )}
                    </Box>
                </Paper>
            );
        }

        return this.props.children;
    }
}
