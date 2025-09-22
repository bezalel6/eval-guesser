'use client';

import React, { useState, useEffect, useCallback, Suspense, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Box, 
  CircularProgress, 
  Typography, 
  Paper, 
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemButton,
  Chip,
  IconButton,
  Alert
} from '@mui/material';
import MemoryIcon from '@mui/icons-material/Memory';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ErrorIcon from '@mui/icons-material/Error';
import Header from '../components/Header';
import ChessgroundBoard from '../components/ChessgroundBoard';
import EvalBar from '../components/EvalBar';
import ErrorBoundary from '../components/ErrorBoundary';
import { Chess } from 'chess.js';
import type { AnalysisLine, EngineInfo } from '../lib/stockfish-engine';
import { useStockfish } from '../lib/stockfish-engine';
import BoardLayout from '../components/BoardLayout';

function AnalysisContent() {
  const searchParams = useSearchParams();
  const initialFen = searchParams.get('fen') || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  
  // Group related state to reduce re-renders
  const [gameState, setGameState] = useState({
    currentFen: initialFen,
    moveHistory: [] as string[],
    currentMoveIndex: 0,
    boardFlipped: false,
    lastAnalysisError: null as string | null
  });
  
  const [analysisData, setAnalysisData] = useState({
    lines: [] as AnalysisLine[],
    evaluation: null as { type: 'cp' | 'mate'; value: number } | null,
    isAnalyzing: false,
    depth: 0
  });
  
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);

  // Get Stockfish engine status for error boundary
  const { engine, isInitialized, initializationError, isInitializing } = useStockfish();

  // Analysis state for inlined sidebar
  interface AnalysisState {
    depth: number;
    evaluation: { type: 'cp' | 'mate'; value: number; stale?: boolean } | null;
    lines: AnalysisLine[];
    engineLines: Map<number, EngineInfo>;
    error: string | null;
    isLoading: boolean;
    isCalculating?: boolean;
  }

  const [analyzing, setAnalyzing] = useState(true);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    depth: 0,
    evaluation: null,
    lines: [],
    engineLines: new Map(),
    error: null,
    isLoading: false
  });
  
  // Use ref for latest state to prevent stale closures
  const analysisStateRef = useRef(analysisState);
  analysisStateRef.current = analysisState;

  // Request tracking to prevent race conditions
  const analysisRequestIdRef = useRef<string>('');
  const currentFenRef = useRef<string>('');
  const infoCleanupRef = useRef<(() => void) | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize board orientation based on turn
  useEffect(() => {
    const chess = new Chess(initialFen);
    setGameState(prev => ({ ...prev, boardFlipped: chess.turn() === 'b' }));
  }, [initialFen]);

  const handleMove = useCallback((from: string, to: string, promotion?: string) => {
    try {
      const chess = new Chess(gameState.currentFen);
      const move = chess.move({
        from,
        to,
        promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined
      });

      if (move) {
        // Batch all state updates
        setHoveredLineIndex(null);
        
        // Single state update for game state
        const newHistory = [...gameState.moveHistory.slice(0, gameState.currentMoveIndex), move.san];
        setGameState(prev => ({
          ...prev,
          currentFen: chess.fen(),
          moveHistory: newHistory,
          currentMoveIndex: newHistory.length,
          lastAnalysisError: null
        }));
        
        // Clear analysis data in one update
        setAnalysisData(prev => ({
          ...prev,
          lines: [],
          evaluation: null
        }));
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error making move:', error);
      setGameState(prev => ({
        ...prev,
        lastAnalysisError: error instanceof Error ? error.message : 'Invalid move'
      }));
      return false;
    }
  }, [gameState.currentFen, gameState.moveHistory, gameState.currentMoveIndex]);

  const goToMove = useCallback((index: number) => {
    if (index < 0 || index > gameState.moveHistory.length) return;
    
    try {
      const chess = new Chess(initialFen);
      for (let i = 0; i < index; i++) {
        chess.move(gameState.moveHistory[i]);
      }
      
      // Batch update
      setGameState(prev => ({
        ...prev,
        currentFen: chess.fen(),
        currentMoveIndex: index,
        lastAnalysisError: null
      }));
    } catch (error) {
      console.error('Error navigating to move:', error);
      setGameState(prev => ({
        ...prev,
        lastAnalysisError: error instanceof Error ? error.message : 'Navigation error'
      }));
    }
  }, [gameState.moveHistory, initialFen]);

  const reset = useCallback(() => {
    // Single batched update
    setGameState({
      currentFen: initialFen,
      moveHistory: [],
      currentMoveIndex: 0,
      boardFlipped: gameState.boardFlipped,
      lastAnalysisError: null
    });
  }, [initialFen, gameState.boardFlipped]);

  const flipBoard = useCallback(() => {
    setGameState(prev => ({ ...prev, boardFlipped: !prev.boardFlipped }));
  }, []);

  // Error recovery handlers
  const handleRetryAnalysis = useCallback(() => {
    setGameState(prev => ({ ...prev, lastAnalysisError: null }));
    // Force engine re-initialization if needed
    if (engine && !isInitialized) {
      window.location.reload();
    }
  }, [engine, isInitialized]);

  const handleContinueWithoutAnalysis = useCallback(() => {
    // Navigate back to main game
    window.history.back();
  }, []);

  // Analysis engine functions (inlined from AnalysisSidebar)
  const generateRequestId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const startAnalysisImmediately = useCallback(async (fenToAnalyze: string) => {
    // Cancel any existing analysis immediately
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Stop the engine's current analysis IMMEDIATELY
    if (engine) {
      await engine.stop();
    }

    if (!engine || !isInitialized || !analyzing) {
      setAnalysisState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    // Set loading state immediately with visual feedback
    setAnalysisState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      // Clear old lines immediately for new position
      lines: [],
      engineLines: new Map(),
      // Show faded evaluation while calculating
      evaluation: prev.evaluation ? { ...prev.evaluation, stale: true } : null
    }));

    // Create new abort controller and request ID
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const requestId = generateRequestId();
    analysisRequestIdRef.current = requestId;
    currentFenRef.current = fenToAnalyze;

    // Start analysis immediately without any delay
    (async () => {
      try {
        // Start analysis with comprehensive error handling
        await engine.analyze(fenToAnalyze, 25);
        
        // Mark that we're now calculating (not just loading)
        if (analysisRequestIdRef.current === requestId) {
          setAnalysisState(prev => ({
            ...prev,
            isCalculating: true
          }));
        }
      } catch (error) {
        // Only handle error if this request is still current
        if (analysisRequestIdRef.current === requestId && !abortController.signal.aborted) {
          console.error('Analysis failed:', error);
          
          let errorMessage = 'Analysis failed. Please try again.';
          
          // Provide specific error messages based on error type
          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes('worker')) {
              errorMessage = 'Chess engine communication failed. Try refreshing the page.';
            } else if (message.includes('timeout')) {
              errorMessage = 'Analysis timed out. Position may be too complex.';
            } else if (message.includes('destroyed')) {
              errorMessage = 'Chess engine was terminated. Please refresh to restart.';
            } else if (message.includes('fen') || message.includes('position')) {
              errorMessage = 'Invalid chess position. Please reset the board.';
            }
          }
          
          setAnalysisState(prev => ({
            ...prev,
            error: errorMessage,
            isLoading: false,
            isCalculating: false
          }));
        }
      }
    })();
  }, [engine, isInitialized, analyzing, generateRequestId]);

  const formatEval = useCallback((evalData: { type: 'cp' | 'mate'; value: number }) => {
    if (evalData.type === 'mate') {
      return `M${Math.abs(evalData.value)}`;
    }
    const pawnValue = (evalData.value / 100).toFixed(2);
    return evalData.value >= 0 ? `+${pawnValue}` : pawnValue;
  }, []);

  const toggleAnalysis = useCallback(() => {
    setAnalyzing(!analyzing);
  }, [analyzing]);

  return (
    <AnalysisErrorBoundary
      onRetryAnalysis={handleRetryAnalysis}
      onContinueWithoutAnalysis={handleContinueWithoutAnalysis}
      engineStatus={{
        isInitialized,
        isInitializing,
        initializationError
      }}
      analysisContext={{
        currentFen: gameState.currentFen,
        lastError: gameState.lastAnalysisError
      }}
    >
      <BoardLayout
        variant="analysis"
        header={(
          <ErrorBoundary
            enableRetry={true}
            resetKeys={[gameState.currentFen]}
            resetOnPropsChange={true}
          >
            <Header 
              title="Analysis Board" 
              showBackButton={true}
              onBackClick={() => window.history.back()}
            />
          </ErrorBoundary>
        )}
        board={(
          <ErrorBoundary
            enableRetry={true}
            resetKeys={[gameState.currentFen, String(gameState.boardFlipped), gameState.currentMoveIndex]}
            resetOnPropsChange={true}
          >
            <AnalysisBoard
              fen={gameState.currentFen}
              onMove={handleMove}
              flipped={gameState.boardFlipped}
              onFlip={flipBoard}
              moveHistory={gameState.moveHistory}
              currentMoveIndex={gameState.currentMoveIndex}
              onGoToMove={goToMove}
              onReset={reset}
              hoveredLine={hoveredLineIndex !== null ? analysisData.lines[hoveredLineIndex] : null}
            />
          </ErrorBoundary>
        )}
        evalBar={(
          <ErrorBoundary
            enableRetry={true}
            resetKeys={[String(analysisData.evaluation), String(analysisData.isAnalyzing)]}
            resetOnPropsChange={true}
          >
            <EvalBar
              mode="display"
              evaluation={analysisData.evaluation}
              height={600}
              stale={analysisData.isAnalyzing}
              showLabel={true}
            />
          </ErrorBoundary>
        )}
        sidebar={(
          <ErrorBoundary
            enableRetry={true}
            resetKeys={[gameState.currentFen, String(isInitialized)]}
            resetOnPropsChange={true}
          >
            <AnalysisSidebar
              fen={gameState.currentFen}
              onAnalysisUpdate={useCallback((lines, evalResult, isAnalyzing, currentDepth) => {
                // Batch update all analysis data
                setAnalysisData({
                  lines,
                  evaluation: evalResult,
                  isAnalyzing,
                  depth: currentDepth
                });
              }, [])}
              moveHistory={gameState.moveHistory}
              currentMoveIndex={gameState.currentMoveIndex}
              onGoToMove={goToMove}
              onLineHover={setHoveredLineIndex}
            />
          </ErrorBoundary>
        )}
      />
    </AnalysisErrorBoundary>
  );
}

export default function AnalysisPage() {
  return (
    <ErrorBoundary
      enableRetry={true}
      onError={(error, errorInfo) => {
        console.error('Top-level analysis page error:', error, errorInfo);
      }}
    >
      <Suspense fallback={
        <Box sx={{ 
          height: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#1a1a1a'
        }}>
          <CircularProgress />
        </Box>
      }>
        <AnalysisContent />
      </Suspense>
    </ErrorBoundary>
  );
}