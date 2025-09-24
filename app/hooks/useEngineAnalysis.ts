/**
 * React Hook: useEngineAnalysis
 * Clean interface for components to use server-side engine with SSE streaming
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import ClientEngineManager from '../lib/engine/client-engine-manager';
import type { AnalysisLine, SSEMessage } from '../types/engine';

interface EngineAnalysisState {
  sessionId: string | null;
  isAnalyzing: boolean;
  isConnected: boolean;
  depth: number;
  evaluation: {
    type: 'cp' | 'mate';
    value: number;
  } | null;
  lines: AnalysisLine[];
  error: string | null;
}

interface UseEngineAnalysisOptions {
  depth?: number;
  multiPV?: number;
  autoStart?: boolean;
}

interface UseEngineAnalysisReturn {
  state: EngineAnalysisState;
  startAnalysis: (fen: string, options?: UseEngineAnalysisOptions) => Promise<void>;
  stopAnalysis: () => Promise<void>;
  isInitialized: boolean;
  error: string | null;
}

const DEFAULT_OPTIONS: UseEngineAnalysisOptions = {
  depth: 20,
  multiPV: 3,
  autoStart: true
};

export function useEngineAnalysis(
  initialFen?: string,
  options: UseEngineAnalysisOptions = DEFAULT_OPTIONS
): UseEngineAnalysisReturn {
  const [state, setState] = useState<EngineAnalysisState>({
    sessionId: null,
    isAnalyzing: false,
    isConnected: false,
    depth: 0,
    evaluation: null,
    lines: [],
    error: null
  });

  const [isInitialized] = useState(true); // Server-side is always "ready"
  const [hookError, setHookError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentFenRef = useRef<string>('');

  /**
   * Cleanup existing connections
   */
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Start analysis for a position
   */
  const startAnalysis = useCallback(async (
    fen: string, 
    analysisOptions: UseEngineAnalysisOptions = {}
  ) => {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options, ...analysisOptions };

    try {
      // Clean up existing connections
      cleanup();

      // Reset state
      setState(prev => ({
        ...prev,
        isAnalyzing: true,
        isConnected: false,
        error: null,
        lines: [],
        evaluation: null,
        depth: 0
      }));

      setHookError(null);
      currentFenRef.current = fen;

      // Create session on server for coordination
      const response = await fetch('/api/engine/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fen,
          depth: mergedOptions.depth,
          multiPV: mergedOptions.multiPV,
          sessionId: state.sessionId // Reuse session if exists
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start analysis');
      }

      const { sessionId } = await response.json();

      setState(prev => ({
        ...prev,
        sessionId,
        isAnalyzing: true,
        isConnected: true
      }));

      // Start client-side analysis
      const engineManager = ClientEngineManager.getInstance();
      
      // Subscribe to updates
      const unsubscribe = engineManager.subscribe(sessionId, (analysisResponse) => {
        setState(prev => ({
          ...prev,
          depth: analysisResponse.depth,
          evaluation: analysisResponse.evaluation,
          lines: analysisResponse.lines,
          isAnalyzing: analysisResponse.status === 'analyzing',
          error: analysisResponse.error || null
        }));

        // Handle completion
        if (analysisResponse.status === 'completed' || 
            analysisResponse.status === 'error' || 
            analysisResponse.status === 'stopped') {
          
          setState(prev => ({
            ...prev,
            isAnalyzing: false
          }));
          
          if (analysisResponse.status === 'error') {
            setHookError(analysisResponse.error || 'Analysis failed');
          }
          
          unsubscribe();
        }
      });

      // Start the actual analysis on the client
      await engineManager.startAnalysis(
        fen,
        mergedOptions.depth!,
        mergedOptions.multiPV!,
        sessionId
      );

      // Store cleanup function
      abortControllerRef.current = {
        abort: () => {
          unsubscribe();
          engineManager.stopAnalysis(sessionId);
        }
      } as AbortController;

    } catch (error) {
      console.error('Failed to start analysis:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start analysis';
      
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: errorMessage
      }));
      setHookError(errorMessage);
      cleanup();
    }
  }, [state.sessionId, options, cleanup]);

  /**
   * Stop current analysis
   */
  const stopAnalysis = useCallback(async () => {
    if (!state.sessionId) {
      return;
    }

    try {
      setState(prev => ({
        ...prev,
        isAnalyzing: false
      }));

      // Stop client-side analysis
      const engineManager = ClientEngineManager.getInstance();
      await engineManager.stopAnalysis(state.sessionId);

      // Notify server (optional for coordination)
      try {
        await fetch('/api/engine/stop', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: state.sessionId
          })
        });
      } catch (serverError) {
        // Server stop is optional for coordination only
        console.warn('Failed to notify server of analysis stop:', serverError);
      }

    } catch (error) {
      console.error('Failed to stop analysis:', error);
    } finally {
      cleanup();
    }
  }, [state.sessionId, cleanup]);

  /**
   * Auto-start analysis when FEN changes
   */
  useEffect(() => {
    if (initialFen && options.autoStart && initialFen !== currentFenRef.current) {
      startAnalysis(initialFen);
    }
  }, [initialFen, options.autoStart, startAnalysis]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    state,
    startAnalysis,
    stopAnalysis,
    isInitialized,
    error: hookError || state.error
  };
}

export default useEngineAnalysis;