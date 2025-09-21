"use client";

import React, { useState, useCallback, useRef } from "react";
import dynamic from 'next/dynamic';
import {
  Button,
  Typography,
  Container,
  Box,
  CircularProgress,
} from "@mui/material";
import { Chess } from "chess.js";
import type { Key } from 'chessground/types';

// Dynamically import ChessgroundBoard to avoid SSR issues
const ChessgroundBoard = dynamic(() => import('./ChessgroundBoard'), {
  ssr: false,
  loading: () => <div style={{ width: '100%', height: '100%', background: '#f0d9b5' }} />
});

const MAX_EVAL = 2000; // 20 pawns in centipawns
const MATE_VALUE = 10000; // Special value for mate

interface Puzzle {
  FEN: string;
  Rating: number;
  PuzzleId: string;
}

const PuzzleDisplay = React.memo(function PuzzleDisplay({ puzzle }: { puzzle: Puzzle }) {
  const [fen, setFen] = useState<string>(puzzle.FEN);
  const [currentFen, setCurrentFen] = useState<string>(puzzle.FEN);
  const [evaluation, setEvaluation] = useState(puzzle.Rating);
  const [userGuess, setUserGuess] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [puzzleId, setPuzzleId] = useState<string>(puzzle.PuzzleId);

  // Local slider state for performance (in centipawns)
  const [sliderValue, setSliderValue] = useState(0);
  const [hasInteractedWithEval, setHasInteractedWithEval] = useState(false);
  const [boardModified, setBoardModified] = useState(false);
  const [hasPremoved, setHasPremoved] = useState(false);
  const [premove, setPremove] = useState<[string, string] | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [boardFlipped, setBoardFlipped] = useState(false);

  // Chess instance for move handling and legal move generation
  const chessRef = useRef(new Chess());

  const fetchRandomPuzzle = useCallback(async () => {
    setLoading(true);
    setShowResult(false);
    setUserGuess(0);
    setSliderValue(0);
    setHasInteractedWithEval(false);
    setBoardModified(false);
    setBoardFlipped(false);
    setHasPremoved(false);
    setPremove(null);

    try {
      const response = await fetch("/api/puzzles/random");
      const newPuzzle = await response.json();

      if (!response.ok) {
        throw new Error("Failed to fetch puzzle");
      }

      console.log("Puzzle received:", newPuzzle);
      setFen(newPuzzle.FEN);
      setCurrentFen(newPuzzle.FEN);
      setPuzzleId(newPuzzle.PuzzleId);
      setEvaluation(newPuzzle.Rating);

      // Load position into chess instance
      try {
        chessRef.current.load(newPuzzle.FEN);
      } catch (_e) {
        // If FEN is invalid for chess.js, create new instance
        chessRef.current = new Chess();
      }
    } catch (error) {
      console.error("Failed to fetch puzzle", error);
      const startingFen =
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      setFen(startingFen);
      setCurrentFen(startingFen);
      setEvaluation(0);
      chessRef.current = new Chess();
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate legal moves for current position
  const getLegalMoves = useCallback((fen: string): Map<Key, Key[]> => {
    const dests = new Map<Key, Key[]>();
    try {
      chessRef.current.load(fen);
      const moves = chessRef.current.moves({ verbose: true });
      
      moves.forEach(move => {
        const from = move.from as Key;
        const to = move.to as Key;
        if (!dests.has(from)) {
          dests.set(from, []);
        }
        dests.get(from)!.push(to);
      });
    } catch (e) {
      console.log("Error calculating moves:", e);
    }
    return dests;
  }, []);

  // Handle piece moves from chessground
  const handleMove = useCallback(
    (from: Key, to: Key) => {
      try {
        // Reuse existing chess instance
        chessRef.current.load(currentFen);
        const move = chessRef.current.move({
          from: from as string,
          to: to as string,
          promotion: "q",
        });

        if (move) {
          // Update the FEN if move is valid
          const newFen = chessRef.current.fen();
          setCurrentFen(newFen);
          setBoardModified(true);
        }
      } catch (e) {
        console.log("Move failed:", e);
      }
    },
    [currentFen]
  );

  // Handle range input change
  const handleRangeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    setSliderValue(value);
    if (!hasInteractedWithEval) {
      setHasInteractedWithEval(true);
    }
  }, [hasInteractedWithEval]);

  // Format evaluation for display (centipawns to decimal pawns)
  const formatEval = useCallback((centipawns: number) => {
    // Check for mate scores
    if (Math.abs(centipawns) >= MATE_VALUE - 1000) {
      const mateIn = Math.sign(centipawns) * (MATE_VALUE - Math.abs(centipawns));
      return centipawns > 0 ? `M${Math.abs(mateIn)}` : `-M${Math.abs(mateIn)}`;
    }
    // Convert centipawns to pawns with 1 decimal
    const pawns = centipawns / 100;
    return pawns >= 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
  }, []);

  // Handle range input mouseup/touchend (when user finishes dragging)
  const handleRangeRelease = useCallback(() => {
    setUserGuess(sliderValue);
  }, [sliderValue]);

  const handleSubmit = useCallback(() => {
    const difference = Math.abs(userGuess - evaluation);
    const points = Math.max(0, 1000 - difference);
    setScore(prevScore => prevScore + points);
    setShowResult(true);
    
    // Update streak
    if (difference <= 100) { // Within 1 pawn
      setStreak(prev => {
        const newStreak = prev + 1;
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }
        return newStreak;
      });
    } else {
      setStreak(0);
    }
  }, [userGuess, evaluation, bestStreak]);

  const handleNextPuzzle = useCallback(() => {
    fetchRandomPuzzle();
  }, [fetchRandomPuzzle]);

  const handleResetPosition = useCallback(() => {
    setCurrentFen(fen);
    setBoardModified(false);
    setHasPremoved(false);
    setPremove(null);
    try {
      chessRef.current.load(fen);
    } catch (_e) {
      chessRef.current = new Chess();
    }
  }, [fen]);

  // Handle premove setting
  const handlePremoveSet = useCallback((orig: Key, dest: Key) => {
    if (!hasPremoved && !boardModified) {
      setPremove([orig as string, dest as string]);
      setHasPremoved(true);
    }
  }, [hasPremoved, boardModified]);

  // Handle premove unset
  const handlePremoveUnset = useCallback(() => {
    setPremove(null);
    setHasPremoved(false);
  }, []);

  // Get turn and check status from FEN
  const getTurnFromFen = useCallback((fen: string) => {
    try {
      chessRef.current.load(fen);
      return {
        turn: chessRef.current.turn() === 'w' ? 'White' : 'Black',
        turnColor: chessRef.current.turn() as 'w' | 'b',
        inCheck: chessRef.current.inCheck()
      };
    } catch {
      return { turn: 'White', turnColor: 'w' as const, inCheck: false };
    }
  }, []);

  const { turn, turnColor, inCheck } = getTurnFromFen(currentFen);
  
  // Auto-orient board to player to move (unless manually flipped)
  const boardOrientation = boardFlipped 
    ? (turnColor === 'w' ? 'black' : 'white') 
    : (turnColor === 'w' ? 'white' : 'black');

  const handleFlipBoard = useCallback(() => {
    setBoardFlipped(prev => !prev);
  }, []);


  return (
    <Container className="app-container" sx={{ position: 'relative' }}>
      {/* Streak panel */}
      <Box sx={{ 
        position: 'absolute', 
        left: 20, 
        top: '50%', 
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: 2,
        background: 'var(--bg-secondary)',
        borderRadius: 1,
        border: '1px solid var(--border-color)',
        minWidth: 140
      }}>
        <Box>
          <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>Streak</Typography>
          <Typography variant="h4" sx={{ color: streak > 0 ? 'var(--accent)' : 'var(--text-primary)' }}>
            {streak}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>Best</Typography>
          <Typography variant="h5" sx={{ color: 'var(--text-primary)' }}>
            {bestStreak}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>Score</Typography>
          <Typography variant="h5" sx={{ color: 'var(--text-primary)' }}>
            {score}
          </Typography>
        </Box>
        
        {showResult && (
          <>
            <Box sx={{ borderTop: '1px solid var(--border-color)', pt: 2 }}>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>Computer Eval</Typography>
              <Typography variant="h5" sx={{ color: 'var(--accent)', fontWeight: 'bold' }}>
                {formatEval(evaluation)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mt: 0.5 }}>
                Diff: {Math.abs((userGuess - evaluation) / 100).toFixed(1)}
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={handleNextPuzzle}
              disabled={loading}
              fullWidth
              sx={{ 
                bgcolor: 'var(--accent)',
                color: 'var(--bg-primary)',
                py: 1,
                '&:hover': { 
                  bgcolor: '#9bc767' 
                },
                '&:disabled': {
                  bgcolor: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)'
                }
              }}
            >
              Next Position
            </Button>
          </>
        )}
      </Box>

      <Typography variant="h2" gutterBottom sx={{ color: 'var(--text-primary)', fontWeight: 300 }}>
        Eval Guesser
      </Typography>
      <Box className="game-board-wrapper">
        <Box className="board-container" sx={{ position: 'relative' }}>
          <ChessgroundBoard
            fen={currentFen}
            onMove={handleMove}
            allowDragging={!boardModified}
            viewOnly={boardModified}
            orientation={boardOrientation}
            movable={{
              free: false,
              color: boardModified ? undefined : 'both',
              dests: boardModified ? new Map() : getLegalMoves(currentFen)
            }}
            premovable={{
              enabled: !boardModified && !hasPremoved,
              showDests: true,
              castle: true,
              events: {
                set: handlePremoveSet,
                unset: handlePremoveUnset
              }
            }}
            check={inCheck}
          />
          {loading && (
            <Box sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '8px'
            }}>
              <CircularProgress sx={{ color: 'var(--accent)' }} />
            </Box>
          )}
        </Box>
        
        {/* Turn indicator and board controls */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          width: '100%', 
          mb: 2,
          px: 1
        }}>
          <Typography variant="body2" sx={{ 
            color: 'var(--text-primary)',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            {turn} to move
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {boardModified && (
              <Box 
                onClick={handleResetPosition}
                sx={{ 
                  cursor: 'pointer', 
                  opacity: 0.6,
                  '&:hover': { opacity: 1 },
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Reset position"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-secondary)">
                  <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                </svg>
              </Box>
            )}
            
            <Box 
              onClick={handleFlipBoard}
              sx={{ 
                cursor: 'pointer', 
                opacity: 0.7,
                '&:hover': { opacity: 1 },
                display: 'flex',
                alignItems: 'center'
              }}
              title="Flip board"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-secondary)">
                <path d="M12 5.83L15.17 9l1.41-1.41L12 3 7.41 7.59 8.83 9 12 5.83zm0 12.34L8.83 15l-1.41 1.41L12 21l4.59-4.59L15.17 15 12 18.17z"/>
              </svg>
            </Box>
          </Box>
        </Box>
        
        <Box className="eval-bar-container">
          <input
            type="range"
            value={sliderValue}
            onChange={handleRangeChange}
            onMouseUp={handleRangeRelease}
            onTouchEnd={handleRangeRelease}
            min={-MAX_EVAL}
            max={MAX_EVAL}
            step={10}
            disabled={showResult || loading}
            className={`eval-slider ${!hasInteractedWithEval ? 'eval-slider-inactive' : ''}`}
            style={{ width: '100%' }}
            aria-label="Evaluation slider"
            onMouseDown={() => !hasInteractedWithEval && setHasInteractedWithEval(true)}
            onTouchStart={() => !hasInteractedWithEval && setHasInteractedWithEval(true)}
          />
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5, mb: 0.5 }}>
            <Typography variant="h5" sx={{ 
              fontWeight: 'bold', 
              color: hasInteractedWithEval ? 'var(--accent)' : 'transparent',
              minHeight: '32px'
            }}>
              {hasInteractedWithEval ? formatEval(sliderValue) : ''}
            </Typography>
          </Box>
        </Box>
      </Box>
      
      <Box className="controls-container">
        {!showResult && hasInteractedWithEval ? (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            size="large"
            sx={{ 
              bgcolor: 'var(--accent)',
              color: 'var(--bg-primary)',
              px: 6,
              py: 1.5,
              fontSize: '1.1rem',
              '&:hover': { 
                bgcolor: '#9bc767' 
              },
              '&:disabled': {
                bgcolor: 'var(--bg-secondary)',
                color: 'var(--text-secondary)'
              }
            }}
          >
            Submit Evaluation
          </Button>
        ) : !showResult && (
          <Box sx={{ minHeight: 48 }} />
        )}
      </Box>
    </Container>
  );
});

export default PuzzleDisplay;
