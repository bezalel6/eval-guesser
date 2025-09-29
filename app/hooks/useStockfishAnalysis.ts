/**
 * useStockfishAnalysis Hook
 * 
 * A React hook that provides easy integration with the Stockfish engine.
 * Features:
 * - Automatic lifecycle management
 * - Real-time analysis updates
 * - Position caching and debouncing
 * - Error handling and recovery
 * - Performance monitoring
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  StockfishEngine, 
  EngineAnalysis, 
  EngineLine, 
  EngineEvaluation,
  EngineOptions,
  getStockfishEngine,
  destroyGlobalEngine
} from '../lib/engine/stockfish-engine';

export interface AnalysisState {
  isReady: boolean;
  isAnalyzing: boolean;
  currentEvaluation: EngineEvaluation | null;
  bestMove: string | null;
  lines: EngineLine[];
  depth: number;
  nodes: number;
  nps: number;
  error: string | null;
}

// Re-export types from stockfish-engine
export type { EngineLine, EngineEvaluation, EngineOptions } from '../lib/engine/stockfish-engine';

export interface AnalysisOptions extends EngineOptions {
  autoAnalyze?: boolean;
  debounceMs?: number;
  enableCaching?: boolean;
}

export interface UseStockfishAnalysisReturn {
  // State
  analysis: AnalysisState;
  
  // Actions
  analyze: (fen: string, moves?: string[], options?: EngineOptions) => void;
  stop: () => void;
  clearCache: () => void;
  
  // Utilities
  formatEvaluation: (evaluation: EngineEvaluation) => string;
  getEvaluationColor: (evaluation: EngineEvaluation) => 'white' | 'black' | 'equal';
  getCacheStats: () => { size: number; positions: string[] };
}

const initialState: AnalysisState = {
  isReady: false,
  isAnalyzing: false,
  currentEvaluation: null,
  bestMove: null,
  lines: [],
  depth: 0,
  nodes: 0,
  nps: 0,
  error: null,
};

export function useStockfishAnalysis(options: AnalysisOptions = {}): UseStockfishAnalysisReturn {
  const [analysis, setAnalysis] = useState<AnalysisState>(initialState);
  const engineRef = useRef<StockfishEngine | null>(null);
  const currentPositionRef = useRef<string | null>(null);
  const optionsRef = useRef(options);
  
  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Initialize engine
  useEffect(() => {
    const engine = getStockfishEngine({
      onReady: () => {
        setAnalysis(prev => ({ ...prev, isReady: true, error: null }));
      },
      
      onAnalysis: (analysisData: EngineAnalysis) => {
        setAnalysis(prev => {
          const newLines = [...prev.lines];
          const existingIndex = newLines.findIndex(line => line.multipv === analysisData.multipv);
          
          const newLine: EngineLine = {
            multipv: analysisData.multipv,
            score: analysisData.score,
            pv: analysisData.pv,
            depth: analysisData.depth
          };
          
          if (existingIndex >= 0) {
            newLines[existingIndex] = newLine;
          } else {
            newLines.push(newLine);
          }
          
          // Sort by multipv
          newLines.sort((a, b) => a.multipv - b.multipv);
          
          // Update current evaluation with the primary line (multipv 1)
          const primaryLine = newLines.find(line => line.multipv === 1);
          const currentEvaluation = primaryLine ? primaryLine.score : prev.currentEvaluation;
          
          return {
            ...prev,
            currentEvaluation,
            lines: newLines,
            depth: Math.max(prev.depth, analysisData.depth),
            nodes: analysisData.nodes,
            nps: analysisData.nps,
            error: null
          };
        });
      },
      
      onBestMove: (bestMove: string) => {
        setAnalysis(prev => ({
          ...prev,
          bestMove,
          isAnalyzing: false
        }));
      },
      
      onError: (error: string) => {
        console.error('Stockfish analysis error:', error);
        setAnalysis(prev => ({
          ...prev,
          error,
          isAnalyzing: false
        }));
      },
      
      onRaw: (data: string) => {
        // Optional: log raw engine output for debugging
        if (process.env.NODE_ENV === 'development') {
          console.debug('Stockfish:', data);
        }
      }
    });
    
    engineRef.current = engine;
    
    // Cleanup on unmount
    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
        // Note: We don't destroy the global engine here as it might be used elsewhere
      }
    };
  }, []);

  // Analyze function
  const analyze = useCallback((fen: string, moves: string[] = [], analysisOptions: EngineOptions = {}) => {
    const engine = engineRef.current;
    if (!engine || !engine.getIsReady()) {
      setAnalysis(prev => ({ ...prev, error: 'Engine not ready' }));
      return;
    }
    
    currentPositionRef.current = fen;
    
    // Reset analysis state
    setAnalysis(prev => ({
      ...prev,
      isAnalyzing: true,
      lines: [],
      depth: 0,
      nodes: 0,
      nps: 0,
      error: null
    }));
    
    const finalOptions = {
      ...optionsRef.current,
      ...analysisOptions
    };
    
    // Use debounced analysis if specified
    if (finalOptions.debounceMs && finalOptions.debounceMs > 0) {
      engine.analyzeDebounced(fen, moves, finalOptions, finalOptions.debounceMs);
    } else {
      engine.analyze(fen, moves, finalOptions);
    }
  }, []);

  // Stop analysis
  const stop = useCallback(() => {
    const engine = engineRef.current;
    if (engine) {
      engine.stop();
      setAnalysis(prev => ({ ...prev, isAnalyzing: false }));
    }
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    const engine = engineRef.current;
    if (engine) {
      engine.clearCache();
    }
  }, []);

  // Format evaluation for display
  const formatEvaluation = useCallback((evaluation: EngineEvaluation): string => {
    if (evaluation.type === 'mate') {
      return `M${Math.abs(evaluation.value)}`;
    } else {
      const pawns = (evaluation.value / 100).toFixed(2);
      return evaluation.value >= 0 ? `+${pawns}` : pawns;
    }
  }, []);

  // Get evaluation color
  const getEvaluationColor = useCallback((evaluation: EngineEvaluation): 'white' | 'black' | 'equal' => {
    if (evaluation.type === 'mate') {
      return evaluation.value > 0 ? 'white' : 'black';
    } else {
      if (evaluation.value > 50) return 'white';
      if (evaluation.value < -50) return 'black';
      return 'equal';
    }
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    const engine = engineRef.current;
    return engine ? engine.getCacheStats() : { size: 0, positions: [] };
  }, []);

  return {
    analysis,
    analyze,
    stop,
    clearCache,
    formatEvaluation,
    getEvaluationColor,
    getCacheStats
  };
}

// Helper hook for automatic analysis on position changes
export function useAutoAnalysis(
  fen: string, 
  moves: string[] = [], 
  options: AnalysisOptions = {}
): UseStockfishAnalysisReturn {
  const stockfish = useStockfishAnalysis(options);
  const prevPositionRef = useRef<string | null>(null);
  
  useEffect(() => {
    const currentPosition = `${fen}|${moves.join(',')}`;
    
    if (
      options.autoAnalyze !== false && 
      stockfish.analysis.isReady && 
      currentPosition !== prevPositionRef.current
    ) {
      prevPositionRef.current = currentPosition;
      stockfish.analyze(fen, moves, options);
    }
  }, [fen, moves, stockfish.analysis.isReady, options, stockfish]);
  
  return stockfish;
}

// Cleanup function for when the app unmounts
export function cleanupStockfish(): void {
  destroyGlobalEngine();
}
