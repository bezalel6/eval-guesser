'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Button, ButtonGroup } from '@mui/material';
import FlipCameraAndroidIcon from '@mui/icons-material/FlipCameraAndroid';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { Chessground } from 'chessground';
import { Api } from 'chessground/api';
import { Config } from 'chessground/config';
import type { Key } from 'chessground/types';
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';
import { Chess } from 'chess.js';
import { playSound, getMoveSound } from '../lib/global-sounds';

interface AnalysisBoardProps {
  fen: string;
  onMove: (from: string, to: string, promotion?: string) => boolean;
  flipped: boolean;
  onFlip: () => void;
  moveHistory: string[];
  currentMoveIndex: number;
  onGoToMove: (index: number) => void;
  onReset: () => void;
}

export default function AnalysisBoard({
  fen,
  onMove,
  flipped,
  onFlip,
  moveHistory,
  currentMoveIndex,
  onGoToMove,
  onReset
}: AnalysisBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotionMove, setPromotionMove] = useState<{from: Key, to: Key} | null>(null);

  // Initialize board
  useEffect(() => {
    if (!boardRef.current || apiRef.current) return;

    const chess = new Chess(fen);
    const color = chess.turn() === 'w' ? 'white' : 'black';
    
    // Calculate legal moves
    const dests = new Map<Key, Key[]>();
    const moves = chess.moves({ verbose: true });
    
    moves.forEach(move => {
      const from = move.from as Key;
      const to = move.to as Key;
      if (!dests.has(from)) {
        dests.set(from, []);
      }
      dests.get(from)!.push(to);
    });

    const config: Config = {
      fen,
      orientation: flipped ? 'black' : 'white',
      turnColor: color,
      movable: {
        free: false,
        color: 'both', // Allow moving both colors for analysis
        dests,
        showDests: true,
        events: {
          after: (orig: Key, dest: Key) => {
            // Check if this is a promotion
            const chess = new Chess(fen);
            const piece = chess.get(orig as any);
            const destRank = dest[1];
            
            if (piece?.type === 'p' && 
                ((piece.color === 'w' && destRank === '8') || 
                 (piece.color === 'b' && destRank === '1'))) {
              // Show promotion dialog
              setIsPromoting(true);
              setPromotionMove({ from: orig, to: dest });
            } else {
              // Regular move
              handleMoveWithSound(orig, dest);
            }
          }
        }
      },
      premovable: {
        enabled: false
      },
      draggable: {
        enabled: true,
        distance: 3,
        showGhost: true,
      },
      selectable: {
        enabled: true,
      },
      events: {
        move: (_orig: Key, _dest: Key) => {
          // Already handled in after event
        }
      },
      animation: {
        enabled: true,
        duration: 200
      },
      highlight: {
        lastMove: true,
        check: true
      },
      disableContextMenu: true,
      coordinates: true,
    };

    apiRef.current = Chessground(boardRef.current, config);

    return () => {
      apiRef.current?.destroy();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only initialize once

  // Update board when FEN or orientation changes
  useEffect(() => {
    if (!apiRef.current) return;

    const chess = new Chess(fen);
    const color = chess.turn() === 'w' ? 'white' : 'black';
    
    // Calculate legal moves
    const dests = new Map<Key, Key[]>();
    const moves = chess.moves({ verbose: true });
    
    moves.forEach(move => {
      const from = move.from as Key;
      const to = move.to as Key;
      if (!dests.has(from)) {
        dests.set(from, []);
      }
      dests.get(from)!.push(to);
    });

    // Check for check
    const inCheck = chess.inCheck();
    
    apiRef.current.set({
      fen,
      turnColor: color,
      orientation: flipped ? 'black' : 'white',
      check: inCheck ? color : false,
      movable: {
        color: 'both',
        dests,
        showDests: true
      }
    });
  }, [fen, flipped]);

  const handleMoveWithSound = (from: Key, to: Key, promotion?: string) => {
    // Try to make the move
    const success = onMove(from, to, promotion);
    
    if (success) {
      // Determine move sound
      const chess = new Chess(fen);
      const move = chess.move({
        from: from as string,
        to: to as string,
        promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined
      });
      
      if (move) {
        const moveSound = getMoveSound({
          captured: move.captured !== undefined,
          castling: move.flags.includes('k') || move.flags.includes('q'),
          check: chess.inCheck(),
          promotion: move.flags.includes('p')
        });
        playSound(moveSound);
      }
    } else {
      playSound('illegal');
    }
  };

  const handlePromotion = (piece: string) => {
    if (promotionMove) {
      handleMoveWithSound(promotionMove.from, promotionMove.to, piece);
    }
    setIsPromoting(false);
    setPromotionMove(null);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          onGoToMove(Math.max(0, currentMoveIndex - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          onGoToMove(Math.min(moveHistory.length, currentMoveIndex + 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          onGoToMove(0);
          break;
        case 'ArrowDown':
          e.preventDefault();
          onGoToMove(moveHistory.length);
          break;
        case 'f':
          e.preventDefault();
          onFlip();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMoveIndex, moveHistory.length, onGoToMove, onFlip]);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      gap: 2
    }}>
      {/* Board Container */}
      <Box sx={{ position: 'relative' }}>
        <Box
          ref={boardRef}
          sx={{
            width: '600px',
            height: '600px',
            '@media (max-width: 768px)': {
              width: '400px',
              height: '400px'
            },
            '@media (max-width: 500px)': {
              width: '350px',
              height: '350px'
            }
          }}
        />
        
        {/* Flip button */}
        <IconButton
          onClick={onFlip}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            }
          }}
          title="Flip board (F)"
        >
          <FlipCameraAndroidIcon />
        </IconButton>

        {/* Promotion Dialog */}
        {isPromoting && (
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            borderRadius: 2,
            padding: 2,
            boxShadow: 3,
            display: 'flex',
            gap: 1,
            zIndex: 1000
          }}>
            <Button variant="contained" onClick={() => handlePromotion('q')}>♕</Button>
            <Button variant="contained" onClick={() => handlePromotion('r')}>♖</Button>
            <Button variant="contained" onClick={() => handlePromotion('b')}>♗</Button>
            <Button variant="contained" onClick={() => handlePromotion('n')}>♘</Button>
          </Box>
        )}
      </Box>

      {/* Navigation Controls */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <ButtonGroup variant="contained" size="small">
          <IconButton 
            onClick={() => onGoToMove(0)}
            disabled={currentMoveIndex === 0}
            title="First move (↑)"
          >
            <FirstPageIcon />
          </IconButton>
          <IconButton 
            onClick={() => onGoToMove(currentMoveIndex - 1)}
            disabled={currentMoveIndex === 0}
            title="Previous move (←)"
          >
            <SkipPreviousIcon />
          </IconButton>
          <IconButton 
            onClick={() => onGoToMove(currentMoveIndex + 1)}
            disabled={currentMoveIndex >= moveHistory.length}
            title="Next move (→)"
          >
            <SkipNextIcon />
          </IconButton>
          <IconButton 
            onClick={() => onGoToMove(moveHistory.length)}
            disabled={currentMoveIndex >= moveHistory.length}
            title="Last move (↓)"
          >
            <LastPageIcon />
          </IconButton>
        </ButtonGroup>
        
        <IconButton 
          onClick={onReset}
          color="error"
          title="Reset board"
        >
          <RestartAltIcon />
        </IconButton>
      </Box>
    </Box>
  );
}