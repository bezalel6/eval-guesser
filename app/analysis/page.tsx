'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import Header from '../components/Header';
import AnalysisBoard from '../components/AnalysisBoard';
import AnalysisSidebar from '../components/AnalysisSidebar';
import ErrorBoundary from '../components/ErrorBoundary';
import AnalysisErrorBoundary from '../components/AnalysisErrorBoundary';
import { Chess } from 'chess.js';
import type { AnalysisLine } from '../lib/stockfish-engine';
import { useStockfish } from '../lib/stockfish-engine';

function AnalysisContent() {
  const searchParams = useSearchParams();
  const initialFen = searchParams.get('fen') || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  
  const [currentFen, setCurrentFen] = useState(initialFen);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [, setAnalysisLines] = useState<AnalysisLine[]>([]);
  const [, setEvaluation] = useState<{ type: 'cp' | 'mate'; value: number } | null>(null);
  const [, setAnalyzing] = useState(false);
  const [, setDepth] = useState(0);
  const [lastAnalysisError, setLastAnalysisError] = useState<string | null>(null);

  // Get Stockfish engine status for error boundary
  const { engine, isInitialized, initializationError, isInitializing } = useStockfish();

  // Initialize board orientation based on turn
  useEffect(() => {
    const chess = new Chess(initialFen);
    setBoardFlipped(chess.turn() === 'b');
  }, [initialFen]);

  const handleMove = (from: string, to: string, promotion?: string) => {
    try {
      const chess = new Chess(currentFen);
      const move = chess.move({
        from,
        to,
        promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined
      });

      if (move) {
        // Update FEN
        setCurrentFen(chess.fen());
        
        // Update move history
        const newHistory = [...moveHistory.slice(0, currentMoveIndex), move.san];
        setMoveHistory(newHistory);
        setCurrentMoveIndex(newHistory.length);
        
        // Clear any previous analysis errors
        setLastAnalysisError(null);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error making move:', error);
      setLastAnalysisError(error instanceof Error ? error.message : 'Invalid move');
      return false;
    }
  };

  const goToMove = (index: number) => {
    if (index < 0 || index > moveHistory.length) return;
    
    try {
      const chess = new Chess(initialFen);
      for (let i = 0; i < index; i++) {
        chess.move(moveHistory[i]);
      }
      
      setCurrentFen(chess.fen());
      setCurrentMoveIndex(index);
      setLastAnalysisError(null);
    } catch (error) {
      console.error('Error navigating to move:', error);
      setLastAnalysisError(error instanceof Error ? error.message : 'Navigation error');
    }
  };

  const reset = () => {
    setCurrentFen(initialFen);
    setMoveHistory([]);
    setCurrentMoveIndex(0);
    setLastAnalysisError(null);
  };

  const flipBoard = () => {
    setBoardFlipped(!boardFlipped);
  };

  // Error recovery handlers
  const handleRetryAnalysis = () => {
    setLastAnalysisError(null);
    // Force engine re-initialization if needed
    if (engine && !isInitialized) {
      window.location.reload();
    }
  };

  const handleContinueWithoutAnalysis = () => {
    // Navigate back to main game
    window.history.back();
  };

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
        currentFen,
        lastError: lastAnalysisError
      }}
    >
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: '#1a1a1a'
      }}>
        <ErrorBoundary
          enableRetry={true}
          resetKeys={[currentFen]}
          resetOnPropsChange={true}
        >
          <Header 
            title="Analysis Board" 
            showBackButton={true}
            onBackClick={() => window.history.back()}
          />
        </ErrorBoundary>
        
        <Box sx={{ 
          display: 'flex', 
          flex: 1,
          gap: 2,
          p: 2,
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%'
        }}>
          {/* Chess Board */}
          <Box sx={{ 
            flex: '1 1 auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <ErrorBoundary
              enableRetry={true}
              resetKeys={[currentFen, boardFlipped, currentMoveIndex]}
              resetOnPropsChange={true}
            >
              <AnalysisBoard
                fen={currentFen}
                onMove={handleMove}
                flipped={boardFlipped}
                onFlip={flipBoard}
                moveHistory={moveHistory}
                currentMoveIndex={currentMoveIndex}
                onGoToMove={goToMove}
                onReset={reset}
              />
            </ErrorBoundary>
          </Box>
          
          {/* Analysis Sidebar */}
          <Box sx={{ 
            width: '400px',
            minWidth: '350px',
            maxWidth: '450px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <ErrorBoundary
              enableRetry={true}
              resetKeys={[currentFen, isInitialized]}
              resetOnPropsChange={true}
            >
              <AnalysisSidebar
                fen={currentFen}
                onAnalysisUpdate={(lines, evalResult, isAnalyzing, currentDepth) => {
                  setAnalysisLines(lines);
                  setEvaluation(evalResult);
                  setAnalyzing(isAnalyzing);
                  setDepth(currentDepth);
                }}
                moveHistory={moveHistory}
                currentMoveIndex={currentMoveIndex}
                onGoToMove={goToMove}
              />
            </ErrorBoundary>
          </Box>
        </Box>
      </Box>
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