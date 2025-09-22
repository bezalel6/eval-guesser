// Test script to verify error boundaries work correctly
// This file can be temporarily imported to test error scenarios

import React from 'react';
import { Button, Box } from '@mui/material';

// Test component that throws errors on demand
export function ErrorTestComponent() {
  const throwRenderError = () => {
    throw new Error('Test render error - this should be caught by ErrorBoundary');
  };

  const throwAsyncError = () => {
    setTimeout(() => {
      throw new Error('Test async error - this will NOT be caught by ErrorBoundary');
    }, 100);
  };

  const throwEngineError = () => {
    throw new Error('Stockfish engine communication failed - this should be caught by AnalysisErrorBoundary');
  };

  const throwAnalysisError = () => {
    throw new Error('Invalid FEN position - this should be caught by AnalysisErrorBoundary');
  };

  return (
    <Box sx={{ p: 2, display: 'flex', gap: 2, flexDirection: 'column' }}>
      <h3>Error Boundary Test Controls</h3>
      <p>Use these buttons to test different error scenarios:</p>
      
      <Button 
        variant="contained" 
        color="error" 
        onClick={throwRenderError}
      >
        Throw Render Error (Caught by ErrorBoundary)
      </Button>
      
      <Button 
        variant="contained" 
        color="warning" 
        onClick={throwAsyncError}
      >
        Throw Async Error (NOT caught - will show in console)
      </Button>
      
      <Button 
        variant="contained" 
        color="error" 
        onClick={throwEngineError}
      >
        Throw Engine Error (Caught by AnalysisErrorBoundary)
      </Button>
      
      <Button 
        variant="contained" 
        color="error" 
        onClick={throwAnalysisError}
      >
        Throw Analysis Error (Caught by AnalysisErrorBoundary)
      </Button>
      
      <div style={{ fontSize: '12px', color: '#666', marginTop: '20px' }}>
        <h4>Expected Behavior:</h4>
        <ul>
          <li><strong>Render Error:</strong> Should show ErrorBoundary UI with retry button</li>
          <li><strong>Async Error:</strong> Will appear in browser console, not caught by boundaries</li>
          <li><strong>Engine Error:</strong> Should show AnalysisErrorBoundary UI with engine-specific guidance</li>
          <li><strong>Analysis Error:</strong> Should show AnalysisErrorBoundary UI with position-specific guidance</li>
        </ul>
        
        <h4>To Test:</h4>
        <ol>
          <li>Temporarily import this component into analysis page</li>
          <li>Click buttons to trigger different error types</li>
          <li>Verify appropriate error boundaries activate</li>
          <li>Test retry functionality</li>
          <li>Remove import when testing is complete</li>
        </ol>
      </div>
    </Box>
  );
}

// Example of how to temporarily add to analysis page for testing:
/*
import { ErrorTestComponent } from '../scripts/test-error-boundaries';

// Add this inside AnalysisContent component, wrapped in error boundary:
<ErrorBoundary>
  <ErrorTestComponent />
</ErrorBoundary>
*/