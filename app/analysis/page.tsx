'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import Header from '../components/Header';
import ChessgroundBoard from '../components/ChessgroundBoard';
import EvalBar from '../components/EvalBar';
import ErrorBoundary from '../components/ErrorBoundary';
import { Chess } from 'chess.js';
import type { AnalysisLine } from '../lib/stockfish-engine';
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

  // Analysis state placeholder (engine integration to be added later)

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

  // Analysis engine integration placeholder (to be implemented)

  return (
    <ErrorBoundary
      analysisMode={true}
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
      enableRetry={true}
      resetKeys={[gameState.currentFen]}
      resetOnPropsChange={true}
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
            <ChessgroundBoard
              fen={gameState.currentFen}
              onMove={handleMove}
              analysisMode={true}
              flipped={gameState.boardFlipped}
              onFlip={flipBoard}
              moveHistory={gameState.moveHistory}
              currentMoveIndex={gameState.currentMoveIndex}
              onGoToMove={goToMove}
              onReset={reset}
              hoveredLine={hoveredLineIndex !== null ? analysisData.lines[hoveredLineIndex] : null}
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
            />
          </ErrorBoundary>
        )}
        evalBar={null}
        sidebar={(
          <Box>Sidebar placeholder - analysis engine integration needed</Box>
        )}
      />
    </ErrorBoundary>
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