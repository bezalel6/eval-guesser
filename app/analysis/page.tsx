'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import Header from '../components/Header';
import AnalysisBoard from '../components/AnalysisBoard';
import AnalysisSidebar from '../components/AnalysisSidebar';
import { Chess } from 'chess.js';
import type { AnalysisLine } from '../lib/stockfish-engine';

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

  // Initialize board orientation based on turn
  useEffect(() => {
    const chess = new Chess(initialFen);
    setBoardFlipped(chess.turn() === 'b');
  }, [initialFen]);

  const handleMove = (from: string, to: string, promotion?: string) => {
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
      
      return true;
    }
    return false;
  };

  const goToMove = (index: number) => {
    if (index < 0 || index > moveHistory.length) return;
    
    const chess = new Chess(initialFen);
    for (let i = 0; i < index; i++) {
      chess.move(moveHistory[i]);
    }
    
    setCurrentFen(chess.fen());
    setCurrentMoveIndex(index);
  };

  const reset = () => {
    setCurrentFen(initialFen);
    setMoveHistory([]);
    setCurrentMoveIndex(0);
  };

  const flipBoard = () => {
    setBoardFlipped(!boardFlipped);
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#1a1a1a'
    }}>
      <Header 
        title="Analysis Board" 
        showBackButton={true}
        onBackClick={() => window.history.back()}
      />
      
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
        </Box>
        
        {/* Analysis Sidebar */}
        <Box sx={{ 
          width: '400px',
          minWidth: '350px',
          maxWidth: '450px',
          display: 'flex',
          flexDirection: 'column'
        }}>
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
        </Box>
      </Box>
    </Box>
  );
}

export default function AnalysisPage() {
  return (
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
  );
}