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

  // Chess instance for move handling and legal move generation
  const chessRef = useRef(new Chess());

  const fetchRandomPuzzle = useCallback(async () => {
    setLoading(true);
    setShowResult(false);
    setUserGuess(0);
    setSliderValue(0);

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
          setCurrentFen(chessRef.current.fen());
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
  }, []);

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
  }, [userGuess, evaluation]);

  const handleNextPuzzle = useCallback(() => {
    fetchRandomPuzzle();
  }, [fetchRandomPuzzle]);

  const handleResetPosition = useCallback(() => {
    setCurrentFen(fen);
    try {
      chessRef.current.load(fen);
    } catch (_e) {
      chessRef.current = new Chess();
    }
  }, [fen]);


  return (
    <Container className="app-container">
      <Typography variant="h2" gutterBottom sx={{ color: 'var(--text-primary)', fontWeight: 300 }}>
        Eval Guesser
      </Typography>
      <Box className="game-board-wrapper">
        <Box className="board-container">
          {loading || !currentFen ? (
            <CircularProgress sx={{ color: 'var(--accent)' }} />
          ) : (
            <ChessgroundBoard
              fen={currentFen}
              onMove={handleMove}
              allowDragging={true}
              viewOnly={false}
              orientation="white"
              movable={{
                free: false,
                color: 'both',
                dests: getLegalMoves(currentFen)
              }}
            />
          )}
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
            className="eval-slider"
            style={{ width: '100%' }}
            aria-label="Evaluation slider"
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5, mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>Black</Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'var(--accent)' }}>
              {formatEval(sliderValue)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>White</Typography>
          </Box>
        </Box>
      </Box>
      
      <Box className="controls-container">
        {!showResult ? (
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
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" sx={{ color: 'var(--text-primary)' }}>
              Actual: <strong style={{ color: 'var(--accent)' }}>{formatEval(evaluation)}</strong>
            </Typography>
            <Typography variant="body1" sx={{ color: 'var(--text-secondary)' }}>
              Difference: {Math.abs((userGuess - evaluation) / 100).toFixed(1)} pawns
            </Typography>
            <Button
              variant="contained"
              onClick={handleNextPuzzle}
              disabled={loading}
              size="large"
              sx={{ 
                bgcolor: 'var(--accent)',
                color: 'var(--bg-primary)',
                px: 6,
                py: 1.5,
                fontSize: '1.1rem',
                mt: 2,
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
          </Box>
        )}
        
        <Button
          variant="text"
          onClick={handleResetPosition}
          disabled={loading}
          size="small"
          sx={{ 
            mt: 2,
            color: 'var(--text-secondary)',
            '&:hover': { 
              color: 'var(--text-primary)' 
            }
          }}
        >
          Reset Board
        </Button>
        <Typography variant="h4" sx={{ mt: 4, color: 'var(--text-primary)', fontWeight: 300 }}>
          Score: <strong>{score}</strong>
        </Typography>
      </Box>
    </Container>
  );
});

export default PuzzleDisplay;
