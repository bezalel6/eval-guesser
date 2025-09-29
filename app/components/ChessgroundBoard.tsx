"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { Chessground } from "chessground";
import { Api } from "chessground/api";
import { Config } from "chessground/config";
import type { Key } from "chessground/types";
import type { DrawShape } from "chessground/draw";
import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.brown.css";
import "chessground/assets/chessground.cburnett.css";
import "../styles/lichess-board.css";
import { playSound, getMoveSound } from "../lib/global-sounds";
import { Chess, Square } from "chess.js";
import { Box, IconButton, Button, ButtonGroup } from '@mui/material';
import FlipCameraAndroidIcon from '@mui/icons-material/FlipCameraAndroid';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

interface ChessgroundBoardProps {
  fen: string;
  onMove?: (from: Key, to: Key, promotion?: string) => boolean | void;
  allowDragging?: boolean;
  viewOnly?: boolean;
  orientation?: "white" | "black";
  premovable?: {
    enabled: boolean;
    showDests?: boolean;
    castle?: boolean;
    events?: {
      set?: (orig: Key, dest: Key) => void;
      unset?: () => void;
    };
  };
  movable?: {
    free?: boolean;
    color?: "white" | "black" | "both" | undefined;
    dests?: Map<Key, Key[]>;
  };
  check?: boolean | "white" | "black";
  // Analysis mode props
  analysisMode?: boolean;
  flipped?: boolean;
  onFlip?: () => void;
  moveHistory?: string[];
  currentMoveIndex?: number;
  onGoToMove?: (index: number) => void;
  onReset?: () => void;
  hoveredLine?: {
    moves: string[];
    evaluation: { type: 'cp' | 'mate'; value: number };
    depth: number;
    san?: string[];
  } | null;
  evalBar?: React.ReactNode;
  showControls?: boolean;
  boardSize?: {
    width: string;
    height: string;
  };
}

export default function ChessgroundBoard({
  fen,
  onMove,
  allowDragging = true,
  viewOnly = false,
  orientation = "white",
  premovable = { enabled: true },
  movable = { free: false, color: "both" },
  check = false,
  // Analysis mode props
  analysisMode = false,
  flipped,
  onFlip,
  moveHistory = [],
  currentMoveIndex = 0,
  onGoToMove,
  onReset,
  hoveredLine,
  evalBar,
  showControls = true,
  boardSize = { width: "100%", height: "100%" },
}: ChessgroundBoardProps) {
  const apiRef = useRef<Api | null>(null);
  const [boardElement, setBoardElement] = useState<HTMLDivElement | null>(null);
  
  // Callback ref to track when DOM element is ready
  const boardRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null && node !== boardElement) {
      setBoardElement(node);
    }
  }, [boardElement]);
  const mountedRef = useRef(true);
  const keyboardListenerRef = useRef<((e: KeyboardEvent) => void) | null>(null);
  
  // Analysis mode state
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotionMove, setPromotionMove] = useState<{from: Key, to: Key} | null>(null);

  // Use flipped prop for analysis mode, otherwise use orientation
  const boardOrientation = analysisMode && flipped !== undefined ? (flipped ? 'black' : 'white') : orientation;

  // Memoized legal moves calculation for analysis mode
  const { dests, color, inCheck } = useMemo(() => {
    if (!analysisMode) {
      return { dests: movable.dests || new Map(), color: 'white', inCheck: false };
    }
    
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
      return { 
        dests: new Map<Key, Key[]>(), 
        color: 'white' as const, 
        inCheck: false 
      };
    }
  }, [fen, analysisMode, movable.dests]);

  // Calculate arrow shapes for hovered line in analysis mode
  const arrowShapes = useMemo<DrawShape[]>(() => {
    if (!analysisMode || !hoveredLine || !hoveredLine.moves || hoveredLine.moves.length === 0) {
      return [];
    }

    // Only show the first (best) move
    const firstMove = hoveredLine.moves[0];
    if (!firstMove || firstMove.length < 4) {
      return [];
    }

    const from = firstMove.substring(0, 2) as Key;
    const to = firstMove.substring(2, 4) as Key;
    
    // Validate squares
    if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) {
      return [];
    }

    // Return single green arrow for best move
    return [{
      orig: from,
      dest: to,
      brush: 'green'
    }];
  }, [analysisMode, hoveredLine]);

  // Handle promotion in analysis mode
  const handlePromotion = useCallback((piece: string) => {
    if (!mountedRef.current || !analysisMode) return;
    
    if (promotionMove && onMove) {
      const success = onMove(promotionMove.from, promotionMove.to, piece);
      if (success && analysisMode) {
        // Play sound for analysis mode
        try {
          const chess = new Chess(fen);
          const move = chess.move({
            from: promotionMove.from as string,
            to: promotionMove.to as string,
            promotion: piece as 'q' | 'r' | 'b' | 'n'
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
          console.warn('Error playing promotion sound:', soundError);
        }
      }
    }
    setIsPromoting(false);
    setPromotionMove(null);
  }, [promotionMove, onMove, fen, analysisMode]);

  // Wrapper for movable.events.after callback (defined before handleMoveWithSound)
  const handleMoveAfterCallback = useCallback((from: Key, to: Key) => {
    if (!onMove) return;
    onMove(from, to);
  }, [onMove]);
  
  // Handle move with sound
  const handleMoveWithSound = useCallback((from: Key, to: Key, promotion?: string) => {
    if (!onMove) return;
    
    // In analysis mode, we need to check the move validity and play sound
    if (analysisMode) {
      try {
        const chess = new Chess(fen);
        const move = chess.move({
          from: from as string,
          to: to as string,
          promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined
        });
        
        if (move) {
          // Play appropriate sound
          const moveSound = getMoveSound({
            captured: move.captured !== undefined,
            castling: move.flags.includes('k') || move.flags.includes('q'),
            check: chess.inCheck(),
            promotion: move.flags.includes('p')
          });
          playSound(moveSound);
          
          // Call the onMove handler with the result
          const result = onMove(from, to, promotion);
          if (result === false) {
            playSound('illegal');
          }
        } else {
          playSound('illegal');
        }
      } catch {
        playSound('illegal');
      }
    } else {
      // Non-analysis mode - just call onMove
      onMove(from, to, promotion);
    }
  }, [fen, onMove, analysisMode]);

  // Handle move after for analysis mode (with promotion detection)
  const handleAfterMove = useCallback((orig: Key, dest: Key) => {
    if (!mountedRef.current) return;
    
    if (analysisMode) {
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
          return;
        }
      } catch (error) {
        console.error('Error handling promotion check:', error);
      }
    }

    // Regular move or non-promotion move
    handleMoveWithSound(orig, dest);
  }, [fen, analysisMode, handleMoveWithSound]);

  // Initialize the board when element is ready
  useEffect(() => {
    if (!boardElement) return;
    
    // Ensure the element is actually in the DOM
    if (!boardElement.parentNode) {
      console.warn('Board element not attached to DOM yet');
      return;
    }

    const config: Config = {
      fen,
      orientation: boardOrientation,
      viewOnly,
      disableContextMenu: true,
      coordinates: true,
      addPieceZIndex: false,
      check: analysisMode ? (inCheck ? (color as 'white' | 'black') : false) : check,
      movable: {
        free: movable.free || false,
        color: viewOnly ? undefined : (analysisMode ? 'both' : movable.color || "both"),
        showDests: true,
        dests: analysisMode ? dests : movable.dests,
        events: analysisMode ? {
          after: handleAfterMove,
        } : {
          after: handleMoveAfterCallback,
        },
      },
      premovable: analysisMode ? { enabled: false } : premovable,
      draggable: {
        enabled: allowDragging && !viewOnly,
        distance: 3,
        autoDistance: false,
        showGhost: true,
        deleteOnDropOff: false,
      },
      selectable: {
        enabled: true,
      },
      events: analysisMode ? {} : {},
      animation: {
        enabled: true,
        duration: analysisMode ? 200 : 50,
      },
      drawable: analysisMode ? {
        enabled: false,
        visible: true,
        shapes: arrowShapes || [],
        autoShapes: arrowShapes || []
      } : {
        enabled: false,
        visible: false
      },
    };

    try {
      apiRef.current = Chessground(boardElement, config);
    } catch (error) {
      console.error('Failed to initialize Chessground:', error);
      console.error('Board element:', boardElement);
      console.error('Config:', config);
      return;
    }

    return () => {
      try {
        apiRef.current?.destroy();
      } catch (error) {
        console.error('Failed to destroy Chessground:', error);
      }
      apiRef.current = null;
    };
  }, [boardElement]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update FEN and check status when they change
  useEffect(() => {
    if (apiRef.current && fen) {
      apiRef.current.set({ fen, check: check });
    }
  }, [fen, check]);

  // Update movable settings
  useEffect(() => {
    if (apiRef.current) {
      apiRef.current.set({
        viewOnly,
        movable: {
          free: movable.free || false,
          color: viewOnly ? undefined : movable.color || "both",
          showDests: true,
          dests: movable.dests,
          events: {
            after: handleMoveAfterCallback,
          },
        },
        draggable: {
          enabled: allowDragging && !viewOnly,
        },
      });
    }
  }, [viewOnly, allowDragging, movable, handleMoveWithSound]);

  // Update orientation
  useEffect(() => {
    if (apiRef.current) {
      apiRef.current.set({ orientation: boardOrientation });
    }
  }, [boardOrientation]);

  // Update analysis-specific properties
  useEffect(() => {
    if (apiRef.current && analysisMode) {
      apiRef.current.set({
        fen,
        turnColor: color as 'white' | 'black',
        check: inCheck ? (color as 'white' | 'black') : false,
        movable: {
          color: 'both',
          dests,
          showDests: true,
        },
        drawable: {
          enabled: false,
          visible: true,
          shapes: arrowShapes || [],
          autoShapes: arrowShapes || []
        }
      });
    }
  }, [analysisMode, fen, color, dests, inCheck, arrowShapes]);

  // Keyboard navigation for analysis mode
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!mountedRef.current || !analysisMode) return;
    
    switch(e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (onGoToMove) onGoToMove(Math.max(0, currentMoveIndex - 1));
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (onGoToMove) onGoToMove(Math.min(moveHistory.length, currentMoveIndex + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (onGoToMove) onGoToMove(0);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (onGoToMove) onGoToMove(moveHistory.length);
        break;
      case 'f':
        e.preventDefault();
        if (onFlip) onFlip();
        break;
    }
  }, [analysisMode, currentMoveIndex, moveHistory.length, onGoToMove, onFlip]);

  // Keyboard navigation with proper cleanup
  useEffect(() => {
    if (!analysisMode) return;
    
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
  }, [analysisMode, handleKeyDown]);

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

  // Method to programmatically make a move
  const makeMove = useCallback((from: Key, to: Key) => {
    if (apiRef.current) {
      apiRef.current.move(from, to);
    }
  }, []);

  // Method to get current FEN
  const getFen = useCallback(() => {
    return apiRef.current?.getFen();
  }, []);

  // Expose methods via ref if needed
  useEffect(() => {
    if (boardElement) {
      const board = boardElement as HTMLDivElement & {
        makeMove?: typeof makeMove;
        getFen?: typeof getFen;
        api?: typeof apiRef.current;
      };
      board.makeMove = makeMove;
      board.getFen = getFen;
      board.api = apiRef.current;
    }
  }, [boardElement, makeMove, getFen]);

  // Render analysis mode with controls or standard board
  if (analysisMode) {
    return (
      <Box sx={{ 
        display: 'flex', 
        gap: 2,
        alignItems: 'flex-start'
      }}>
        {/* Board and controls */}
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
                width: boardSize.width === "100%" ? '600px' : boardSize.width,
                height: boardSize.height === "100%" ? '600px' : boardSize.height,
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

          {/* Board Controls */}
          {showControls && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center' }}>
              {/* Flip button */}
              {onFlip && (
                <IconButton
                  onClick={onFlip}
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    }
                  }}
                  title="Flip board (F)"
                >
                  <FlipCameraAndroidIcon />
                </IconButton>
              )}
            </Box>
          )}

          {/* Navigation Controls */}
          {showControls && onGoToMove && (
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
              
              {onReset && (
                <IconButton 
                  onClick={onReset}
                  color="error"
                  title="Reset board"
                >
                  <RestartAltIcon />
                </IconButton>
              )}
            </Box>
          )}
        </Box>
          
        {/* Eval bar integrated directly */}
        {evalBar && (
          <Box sx={{ 
            display: 'flex',
            height: boardSize.height === "100%" ? '600px' : boardSize.height,
            alignSelf: 'center',
            '@media (max-width: 768px)': {
              height: '400px'
            },
            '@media (max-width: 500px)': {
              height: '350px'
            }
          }}>
            {evalBar}
          </Box>
        )}
      </Box>
    );
  }

  // Standard mode
  return (
    <div
      ref={boardRef}
      style={{
        width: boardSize.width,
        height: boardSize.height,
        aspectRatio: "1 / 1",
      }}
    />
  );
}
