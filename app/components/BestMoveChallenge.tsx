"use client";

import React, { useState, useCallback, useRef } from "react";
import { Box, Typography, Button, Paper, IconButton } from "@mui/material";
import { Chess } from "chess.js";
import dynamic from 'next/dynamic';
import type { Key } from 'chessground/types';
import { GameState, GameAction } from "../hooks/useGameReducer";
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SwapVertIcon from '@mui/icons-material/SwapVert';

const ChessgroundBoard = dynamic(() => import('./ChessgroundBoard'), {
  ssr: false,
  loading: () => <Box sx={{ aspectRatio: '1 / 1', width: '100%', backgroundColor: 'background.paper' }} />
});

interface BestMoveChallengeProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export default function BestMoveChallenge({ state, dispatch }: BestMoveChallengeProps) {
  const { puzzle, boardFlipped } = state;
  const [localBoardFlipped, setLocalBoardFlipped] = useState(boardFlipped);
  const [hasMovedPiece, setHasMovedPiece] = useState(false);
  const chessRef = useRef(new Chess());
  
  // Get turn from FEN
  const getTurnFromFen = useCallback((fen: string) => {
    try {
      chessRef.current.load(fen);
      return {
        turn: chessRef.current.turn() === 'w' ? 'White' : 'Black',
        turnColor: chessRef.current.turn(),
        inCheck: chessRef.current.inCheck(),
      };
    } catch {
      return { turn: 'White', turnColor: 'w' as const, inCheck: false };
    }
  }, []);
  
  const { turn, turnColor, inCheck } = getTurnFromFen(puzzle.FEN);
  const boardOrientation = localBoardFlipped ? (turnColor === 'w' ? 'black' : 'white') : (turnColor === 'w' ? 'white' : 'black');
  
  // Get legal moves
  const getLegalMoves = useCallback((fen: string): Map<Key, Key[]> => {
    const dests = new Map<Key, Key[]>();
    try {
      chessRef.current.load(fen);
      const moves = chessRef.current.moves({ verbose: true });
      moves.forEach(move => {
        const from = move.from as Key;
        const to = move.to as Key;
        if (!dests.has(from)) dests.set(from, []);
        dests.get(from)!.push(to);
      });
    } catch (e) {
      console.log("Error calculating moves:", e);
    }
    return dests;
  }, []);
  
  const handleMove = useCallback((from: Key, to: Key) => {
    if (!hasMovedPiece) {
      setHasMovedPiece(true);
      // Submit the move
      dispatch({ type: 'SUBMIT_BEST_MOVE', payload: { from: from as string, to: to as string } });
    }
  }, [hasMovedPiece, dispatch]);
  
  const handleSkip = () => {
    dispatch({ type: 'SKIP_BEST_MOVE' });
  };
  
  return (
    <Box sx={{ width: '100%', maxWidth: '600px' }}>
      <Paper elevation={3} sx={{ p: 2, mb: 2, textAlign: 'center', backgroundColor: 'primary.main', color: 'white' }}>
        <Typography variant="h5" gutterBottom>
          🎯 Bonus Challenge!
        </Typography>
        <Typography variant="body1">
          Can you find the best move? +500 points if correct!
        </Typography>
      </Paper>
      
      <Box className="board-container" sx={{ mb: 1 }}>
        <ChessgroundBoard
          fen={puzzle.FEN}
          onMove={handleMove}
          orientation={boardOrientation}
          check={inCheck}
          viewOnly={hasMovedPiece}
          movable={{
            free: false,
            color: hasMovedPiece ? undefined : 'both',
            dests: hasMovedPiece ? new Map() : getLegalMoves(puzzle.FEN)
          }}
        />
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
        <Typography variant="body2" fontWeight="bold">{turn} to move</Typography>
        <Box>
          <IconButton title="Flip Board" onClick={() => setLocalBoardFlipped(!localBoardFlipped)}>
            <SwapVertIcon />
          </IconButton>
        </Box>
      </Box>
      
      {!hasMovedPiece && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button 
            variant="outlined" 
            startIcon={<SkipNextIcon />}
            onClick={handleSkip}
            sx={{ textTransform: 'none' }}
          >
            Skip Challenge (0 points)
          </Button>
        </Box>
      )}
    </Box>
  );
}