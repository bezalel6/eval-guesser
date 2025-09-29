'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableRow,
  IconButton,
  Tooltip
} from '@mui/material';
import { Help as HelpIcon } from '@mui/icons-material';
import { Chess } from 'chess.js';
import ChessgroundBoard from '../components/ChessgroundBoard';
import AnalysisSidebar from '../components/AnalysisSidebar';
import EvalBar from '../components/EvalBar';
import EngineErrorBoundary from '../components/EngineErrorBoundary';
import { useAutoAnalysis, type EngineLine } from '../hooks/useStockfishAnalysis';
import type { Key } from 'chessground/types';
import type { Square } from 'chess.js';

export default function AnalysisPage() {
  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [hoveredLine, setHoveredLine] = useState<EngineLine | null>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Sound refs
  const moveSoundRef = useRef<HTMLAudioElement | null>(null);
  const captureSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize sounds
  useEffect(() => {
    moveSoundRef.current = new Audio('/sounds/move.mp3');
    captureSoundRef.current = new Audio('/sounds/capture.mp3');
  }, []);

  // Initialize Stockfish analysis with auto-analysis enabled
  const stockfish = useAutoAnalysis(fen, moveHistory.slice(0, currentMoveIndex), {
    autoAnalyze: true,
    debounceMs: 500,
    depth: 18,
    multiPV: 5,
    enableCaching: true
  });

  // We'll add keyboard shortcuts after all functions are defined

  const playSound = useCallback((isCapture: boolean) => {
    const sound = isCapture ? captureSoundRef.current : moveSoundRef.current;
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {
        // Ignore errors if sound can't play (e.g., autoplay restrictions)
      });
    }
  }, []);

  const handleMove = useCallback((orig: Key, dest: Key, promotion?: string) => {
    try {
      // Check if it's a capture before making the move
      const capturedPiece = chess.get(dest as Square);
      const isCapture = capturedPiece !== null;

      const moveResult = chess.move({
        from: orig as Square,
        to: dest as Square,
        promotion: (promotion || 'q') as 'q' | 'r' | 'b' | 'n'
      });

      if (moveResult) {
        // Play appropriate sound
        playSound(isCapture || moveResult.captured !== undefined);

        const newHistory = [...moveHistory.slice(0, currentMoveIndex), moveResult.san];
        setMoveHistory(newHistory);
        setCurrentMoveIndex(newHistory.length);
        setFen(chess.fen());
        return true;
      }
    } catch (e) {
      console.error('Invalid move:', e);
      return true;
    }
    return false;
  }, [chess, moveHistory, currentMoveIndex, playSound]);

  // Handle engine move suggestions
  const handleEngineMove = useCallback((move: string) => {
    try {
      const moveResult = chess.move(move);
      if (moveResult) {
        playSound(moveResult.captured !== undefined);
        const newHistory = [...moveHistory.slice(0, currentMoveIndex), moveResult.san];
        setMoveHistory(newHistory);
        setCurrentMoveIndex(newHistory.length);
        setFen(chess.fen());
      }
    } catch (e) {
      console.error('Invalid engine move:', e);
    }
  }, [chess, moveHistory, currentMoveIndex, playSound]);

  const goToMove = useCallback((index: number) => {
    // Reset to starting position
    chess.reset();

    // Replay moves up to the desired index
    const moves = moveHistory.slice(0, index);
    let lastMoveWasCapture = false;

    moves.forEach(san => {
      const move = chess.move(san);
      if (move) {
        lastMoveWasCapture = move.captured !== undefined;
      }
    });

    // Play sound for the last move if we're moving forward
    if (index > currentMoveIndex && index > 0) {
      playSound(lastMoveWasCapture);
    }

    setCurrentMoveIndex(index);
    setFen(chess.fen());
  }, [chess, moveHistory, currentMoveIndex, playSound]);

  const flipBoard = useCallback(() => {
    setOrientation(prev => prev === 'white' ? 'black' : 'white');
  }, []);

  const resetBoard = useCallback(() => {
    chess.reset();
    setFen(chess.fen());
    setMoveHistory([]);
    setCurrentMoveIndex(0);
  }, [chess]);

  const getLegalMoves = useCallback(() => {
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

    return dests;
  }, [chess]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getLastMove = useCallback((): [Key, Key] | undefined => {
    if (moveHistory.length === 0) return undefined;

    try {
      // Get the last move from history
      const tempChess = new Chess();
      moveHistory.slice(0, currentMoveIndex).forEach(san => {
        tempChess.move(san);
      });

      const history = tempChess.history({ verbose: true });
      const lastMove = history[history.length - 1];

      if (lastMove) {
        return [lastMove.from as Key, lastMove.to as Key];
      }
    } catch (e) {
      console.error('Error getting last move:', e);
    }

    return undefined;
  }, [moveHistory, currentMoveIndex]);

  // Keyboard shortcuts - defined after all functions
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't handle shortcuts if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'arrowleft':
          e.preventDefault();
          if (currentMoveIndex > 0) {
            goToMove(currentMoveIndex - 1);
          }
          break;
        case 'arrowright':
          e.preventDefault();
          if (currentMoveIndex < moveHistory.length) {
            goToMove(currentMoveIndex + 1);
          }
          break;
        case 'arrowup':
          e.preventDefault();
          goToMove(0);
          break;
        case 'arrowdown':
          e.preventDefault();
          goToMove(moveHistory.length);
          break;
        case 'f':
          e.preventDefault();
          flipBoard();
          break;
        case 'r':
          e.preventDefault();
          resetBoard();
          break;
        case 's':
          e.preventDefault();
          stockfish.stop();
          break;
        case 'c':
          e.preventDefault();
          stockfish.clearCache();
          break;
        case 'escape':
          e.preventDefault();
          stockfish.stop();
          break;
        case 'h':
        case '?':
          e.preventDefault();
          setShowKeyboardHelp(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentMoveIndex, moveHistory.length, goToMove, flipBoard, resetBoard, stockfish]);

  return (
    <EngineErrorBoundary>
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1a1a1a'
      }}>
        {/* Header */}
        <Container maxWidth="xl" sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Typography variant="h4" gutterBottom color="white">
              Analysis Board
            </Typography>
            <Tooltip title="Keyboard shortcuts (H)">
              <IconButton
                onClick={() => setShowKeyboardHelp(true)}
                sx={{ position: 'absolute', right: 0, color: 'white' }}
              >
                <HelpIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Container>

        {/* Main Content */}
        <Box sx={{
          display: 'flex',
          flex: 1,
          gap: 2,
          p: 2,
          maxWidth: '1600px',
          margin: '0 auto',
          width: '100%',
          alignItems: 'flex-start'
        }}>
          {/* Main Board Area */}
          <Box sx={{
            flex: '1 1 auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            position: 'relative',
            maxWidth: 'calc(100vh - 200px)'
          }}>
            <Box sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              aspectRatio: '1'
            }}>
              {/* Chess Board */}
              <Box sx={{ flex: 1, aspectRatio: '1', maxWidth: '600px' }}>
                <ChessgroundBoard
                  fen={fen}
                  orientation={orientation}
                  onMove={handleMove}
                  analysisMode={true}
                  movable={{
                    free: false,
                    dests: getLegalMoves()
                  }}
                  check={chess.inCheck()}
                  viewOnly={false}
                  premovable={{ enabled: false }}
                  hoveredLine={hoveredLine ? {
                    moves: hoveredLine.pv,
                    evaluation: hoveredLine.score,
                    depth: hoveredLine.depth
                  } : undefined}
                  flipped={orientation === 'black'}
                  onFlip={flipBoard}
                  moveHistory={moveHistory}
                  currentMoveIndex={currentMoveIndex}
                  onGoToMove={goToMove}
                  onReset={resetBoard}
                  showControls={true}
                />
              </Box>

              {/* Evaluation Bar */}
              <Box sx={{ ml: 2, height: '600px', display: 'flex' }}>
                <EvalBar
                  mode="display"
                  evaluation={stockfish.analysis.currentEvaluation}
                  height={600}
                  width={40}
                  showLabel={false}
                  stale={!stockfish.analysis.isReady || stockfish.analysis.error !== null}
                />
              </Box>
            </Box>
          </Box>

          {/* Analysis Sidebar */}
          <Box sx={{ width: 350, height: 'calc(100vh - 120px)' }}>
            <AnalysisSidebar
              analysis={stockfish.analysis}
              currentFen={fen}
              onMoveClick={handleEngineMove}
              onLineHover={setHoveredLine}
              onStop={stockfish.stop}
              onClearCache={stockfish.clearCache}
              isAnalyzing={stockfish.analysis.isAnalyzing}
              cacheStats={stockfish.getCacheStats()}
            />
          </Box>

          {/* Move History Panel */}
          <Paper sx={{ width: 300, height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, pb: 1 }}>
              <Typography variant="h6" gutterBottom>
                Game Controls
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button size="small" variant="outlined" onClick={flipBoard}>
                  Flip
                </Button>
                <Button size="small" variant="outlined" onClick={resetBoard}>
                  Reset
                </Button>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Position Status
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Turn: {chess.turn() === 'w' ? 'White' : 'Black'}
                </Typography>
                {chess.inCheck() && (
                  <Typography variant="body2" color="error">
                    Check!
                  </Typography>
                )}
                {chess.isCheckmate() && (
                  <Typography variant="body2" color="error">
                    Checkmate!
                  </Typography>
                )}
                {chess.isDraw() && (
                  <Typography variant="body2" color="warning.main">
                    Draw
                  </Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ px: 2, pb: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Move History
              </Typography>
            </Box>

            {/* Move History */}
            <Box sx={{ flex: 1, overflow: 'auto', px: 2 }}>
              {moveHistory.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 1, textAlign: 'center' }}>
                  No moves yet
                </Typography>
              ) : (
                <Box>
                  {Array.from({ length: Math.ceil(moveHistory.length / 2) }, (_, i) => {
                    const moveNumber = i + 1;
                    const whiteMove = moveHistory[i * 2];
                    const blackMove = moveHistory[i * 2 + 1];
                    const whiteMoveIndex = i * 2;
                    const blackMoveIndex = i * 2 + 1;

                    return (
                      <Box
                        key={i}
                        sx={{
                          display: 'flex',
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.05)'
                          }
                        }}
                      >
                        <Box
                          sx={{
                            width: '40px',
                            p: 0.5,
                            color: 'text.secondary',
                            textAlign: 'right',
                            pr: 1,
                            fontSize: '0.875rem'
                          }}
                        >
                          {moveNumber}.
                        </Box>

                        <Button
                          size="small"
                          onClick={() => goToMove(whiteMoveIndex + 1)}
                          sx={{
                            flex: 1,
                            justifyContent: 'flex-start',
                            color: whiteMoveIndex < currentMoveIndex ? 'text.primary' : 'text.secondary',
                            backgroundColor: whiteMoveIndex === currentMoveIndex - 1 ? 'primary.main' : 'transparent',
                            fontWeight: whiteMoveIndex === currentMoveIndex - 1 ? 600 : 400,
                            fontSize: '0.875rem',
                            p: 0.5,
                            minHeight: 'auto',
                            textTransform: 'none',
                          }}
                        >
                          {whiteMove}
                        </Button>

                        {blackMove && (
                          <Button
                            size="small"
                            onClick={() => goToMove(blackMoveIndex + 1)}
                            sx={{
                              flex: 1,
                              justifyContent: 'flex-start',
                              color: blackMoveIndex < currentMoveIndex ? 'text.primary' : 'text.secondary',
                              backgroundColor: blackMoveIndex === currentMoveIndex - 1 ? 'primary.main' : 'transparent',
                              fontWeight: blackMoveIndex === currentMoveIndex - 1 ? 600 : 400,
                              fontSize: '0.875rem',
                              p: 0.5,
                              minHeight: 'auto',
                              textTransform: 'none',
                            }}
                          >
                            {blackMove}
                          </Button>
                        )}
                        {!blackMove && <Box sx={{ flex: 1 }} />}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>

            {/* Navigation buttons */}
            <Box sx={{ p: 2, pt: 1 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => goToMove(0)}
                  disabled={currentMoveIndex === 0}
                >
                  Start
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => goToMove(currentMoveIndex - 1)}
                  disabled={currentMoveIndex === 0}
                >
                  ←
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => goToMove(currentMoveIndex + 1)}
                  disabled={currentMoveIndex >= moveHistory.length}
                >
                  →
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => goToMove(moveHistory.length)}
                  disabled={currentMoveIndex === moveHistory.length}
                >
                  End
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Keyboard Shortcuts Help Dialog */}
        <Dialog
          open={showKeyboardHelp}
          onClose={() => setShowKeyboardHelp(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Keyboard Shortcuts
          </DialogTitle>
          <DialogContent>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>
                    <Box component="kbd" sx={{
                      px: 1,
                      py: 0.5,
                      backgroundColor: 'grey.200',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.875rem'
                    }}>
                      ← →
                    </Box>
                  </TableCell>
                  <TableCell>Navigate moves</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Box component="kbd" sx={{
                      px: 1,
                      py: 0.5,
                      backgroundColor: 'grey.200',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.875rem'
                    }}>
                      ↑ ↓
                    </Box>
                  </TableCell>
                  <TableCell>Jump to start/end</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Box component="kbd" sx={{
                      px: 1,
                      py: 0.5,
                      backgroundColor: 'grey.200',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.875rem'
                    }}>
                      F
                    </Box>
                  </TableCell>
                  <TableCell>Flip board</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Box component="kbd" sx={{
                      px: 1,
                      py: 0.5,
                      backgroundColor: 'grey.200',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.875rem'
                    }}>
                      R
                    </Box>
                  </TableCell>
                  <TableCell>Reset board</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Box component="kbd" sx={{
                      px: 1,
                      py: 0.5,
                      backgroundColor: 'grey.200',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.875rem'
                    }}>
                      S
                    </Box>
                  </TableCell>
                  <TableCell>Stop analysis</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Box component="kbd" sx={{
                      px: 1,
                      py: 0.5,
                      backgroundColor: 'grey.200',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.875rem'
                    }}>
                      C
                    </Box>
                  </TableCell>
                  <TableCell>Clear cache</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Box component="kbd" sx={{
                      px: 1,
                      py: 0.5,
                      backgroundColor: 'grey.200',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.875rem'
                    }}>
                      H / ?
                    </Box>
                  </TableCell>
                  <TableCell>Show this help</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Box component="kbd" sx={{
                      px: 1,
                      py: 0.5,
                      backgroundColor: 'grey.200',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.875rem'
                    }}>
                      Esc
                    </Box>
                  </TableCell>
                  <TableCell>Stop analysis</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowKeyboardHelp(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </EngineErrorBoundary>
  );
}