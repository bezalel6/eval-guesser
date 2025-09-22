'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
import type { DrawShape } from 'chessground/draw';
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';
import '../styles/lichess-board.css';
import { Chess, Square } from 'chess.js';
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
  hoveredLine?: {
    moves: string[];
    evaluation: { type: 'cp' | 'mate'; value: number };
    depth: number;
    san?: string[];
  } | null;
}

const AnalysisBoard = React.memo(function AnalysisBoard({
  fen,
  onMove,
  flipped,
  onFlip,
  moveHistory,
  currentMoveIndex,
  onGoToMove,
  onReset,
  hoveredLine
}: AnalysisBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const mountedRef = useRef(true);
  const keyboardListenerRef = useRef<((e: KeyboardEvent) => void) | null>(null);
  
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotionMove, setPromotionMove] = useState<{from: Key, to: Key} | null>(null);

  // Stable callbacks to prevent closure memory leaks
  const handleMoveWithSoundRef = useRef<((from: Key, to: Key, promotion?: string) => void) | null>(null);
  
  const playMoveSound = (moveSuccess: boolean, fen: string, from: string, to: string, promotion?: string) => {
    if (!moveSuccess) {
      playSound('illegal');
      return;
    }
    try {
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
    } catch (soundError) {
      console.warn('Error playing move sound:', soundError);
    }
  };

  const playMoveSound = (moveSuccess: boolean, fen: string, from: string, to: string, promotion?: string) => {
    if (!moveSuccess) {
      playSound('illegal');
      return;
    }
    try {
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
    } catch (soundError) {
      console.warn('Error playing move sound:', soundError);
    }
  };

  const handleMoveWithSound = useCallback((from: Key, to: Key, promotion?: string) => {
    if (!mountedRef.current) return;
    
    const success = onMove(from, to, promotion);
    playMoveSound(success, fen, from, to, promotion);
  }, [fen, onMove]);

  // Store the stable callback in ref to prevent closure leaks
  handleMoveWithSoundRef.current = handleMoveWithSound;

  const handlePromotion = useCallback((piece: string) => {
    if (!mountedRef.current) return;
    
    if (promotionMove && handleMoveWithSoundRef.current) {
      handleMoveWithSoundRef.current(promotionMove.from, promotionMove.to, piece);
    }
    setIsPromoting(false);
    setPromotionMove(null);
  }, [promotionMove]);

  // Memoized legal moves calculation
  const { dests, color, inCheck } = useMemo(() => {
    try {
      const chess = new Chess(fen);
      const color = chess.turn() === 'w' ? 'white' : 'black';
      const inCheck = chess.inCheck();
      
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

      return { dests, color, inCheck };
    } catch (error) {
      console.error('Error calculating legal moves:', error);
      // Return safe defaults to prevent component crash
      return { 
        dests: new Map<Key, Key[]>(), 
        color: 'white' as const, 
        inCheck: false 
      };
    }
  }, [fen]);

  // Stable move handler to prevent event listener re-registration
  const handleAfterMove = useCallback((orig: Key, dest: Key) => {
    if (!mountedRef.current) return;
    
    try {
      // Check if this is a promotion
      const chess = new Chess(fen);
      const piece = chess.get(orig as Square);
      const destRank = dest[1];
      
      if (piece?.type === 'p' && 
          ((piece.color === 'w' && destRank === '8') || 
           (piece.color === 'b' && destRank === '1'))) {
        // Show promotion dialog
        setIsPromoting(true);
        setPromotionMove({ from: orig, to: dest });
      } else if (handleMoveWithSoundRef.current) {
        // Regular move
        handleMoveWithSoundRef.current(orig, dest);
      }
    } catch (error) {
      console.error('Error handling move:', error);
      // Try to proceed with regular move anyway
      if (handleMoveWithSoundRef.current) {
        handleMoveWithSoundRef.current(orig, dest);
      }
    }
  }, [fen]);

  // Initialize board once
  useEffect(() => {
    if (!boardRef.current || apiRef.current || !mountedRef.current) return;

    const config: Config = {
      fen,
      orientation: flipped ? 'black' : 'white',
      turnColor: color as 'white' | 'black',
      movable: {
        free: false,
        color: 'both', // Allow moving both colors for analysis
        dests,
        showDests: true,
        events: {
          after: handleAfterMove
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
      if (apiRef.current && mountedRef.current) {
        apiRef.current.destroy();
      }
      apiRef.current = null;
    };
  }, [fen, flipped, color, dests, handleAfterMove]);

  // Calculate arrow shapes for hovered line
  const arrowShapes = useMemo<DrawShape[]>(() => {
    if (!hoveredLine || !hoveredLine.moves || hoveredLine.moves.length === 0) {
      return [];
    }

    const shapes: DrawShape[] = [];
    const movesToShow = hoveredLine.moves.slice(0, 3); // Show first 3 moves
    
    for (let i = 0; i < movesToShow.length; i++) {
      const move = movesToShow[i];
      if (move && move.length >= 4) {
        const from = move.substring(0, 2) as Key;
        const to = move.substring(2, 4) as Key;
        
        // Validate squares
        if (/^[a-h][1-8]$/.test(from) && /^[a-h][1-8]$/.test(to)) {
          shapes.push({
            orig: from,
            dest: to,
            brush: i === 0 ? 'green' : i === 1 ? 'blue' : 'yellow'
          });
        }
      }
    }
    
    return shapes;
  }, [hoveredLine]); // Memo will handle the comparison

  // Update board when dependencies change (but don't recreate)
  useEffect(() => {
    if (!apiRef.current || !mountedRef.current) return;
    
    // Use RAF to batch DOM updates with browser paint
    const rafId = requestAnimationFrame(() => {
      if (!apiRef.current || !mountedRef.current) return;
      
      apiRef.current.set({
        fen,
        turnColor: color as 'white' | 'black',
        orientation: flipped ? 'black' : 'white',
        check: inCheck ? (color as 'white' | 'black') : false,
        movable: {
          color: 'both',
          dests,
          showDests: true,
          events: {
            after: handleAfterMove
          }
        },
        drawable: {
          enabled: false,
          visible: true,
          shapes: arrowShapes,
          autoShapes: arrowShapes
        }
      });
    });
    
    return () => cancelAnimationFrame(rafId);
  }, [fen, flipped, color, dests, inCheck, handleAfterMove, arrowShapes]);

  // Stable keyboard event handler to prevent listener leaks
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!mountedRef.current) return;
    
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
  }, [currentMoveIndex, moveHistory.length, onGoToMove, onFlip]);

  // Keyboard navigation with proper cleanup and single listener
  useEffect(() => {
    // Remove existing listener if any
    if (keyboardListenerRef.current) {
      window.removeEventListener('keydown', keyboardListenerRef.current);
    }
    
    // Store current handler
    keyboardListenerRef.current = handleKeyDown;
    
    // Add new listener
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      if (keyboardListenerRef.current) {
        window.removeEventListener('keydown', keyboardListenerRef.current);
        keyboardListenerRef.current = null;
      }
    };
  }, [handleKeyDown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      
      // Cleanup keyboard listener
      if (keyboardListenerRef.current) {
        window.removeEventListener('keydown', keyboardListenerRef.current);
        keyboardListenerRef.current = null;
      }
      
      // Cleanup chessground
      if (apiRef.current) {
        apiRef.current.destroy();
        apiRef.current = null;
      }
    };
  }, []);

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
});

export default AnalysisBoard;