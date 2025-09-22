'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemButton,
  Chip,
  IconButton,
  Alert
} from '@mui/material';
import MemoryIcon from '@mui/icons-material/Memory';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ErrorIcon from '@mui/icons-material/Error';
import { useStockfish, type AnalysisLine, type EngineInfo } from '../lib/stockfish-engine';
import { Chess } from 'chess.js';

interface AnalysisSidebarProps {
  fen: string;
  onAnalysisUpdate: (
    lines: AnalysisLine[], 
    evaluation: { type: 'cp' | 'mate'; value: number } | null,
    analyzing: boolean,
    depth: number
  ) => void;
  moveHistory: string[];
  currentMoveIndex: number;
  onGoToMove: (index: number) => void;
}

export default function AnalysisSidebar({
  fen,
  onAnalysisUpdate,
  moveHistory,
  currentMoveIndex,
  onGoToMove
}: AnalysisSidebarProps) {
  const { engine, isInitialized, initializationError, isInitializing } = useStockfish();
  const [analyzing, setAnalyzing] = useState(true);
  const [depth, setDepth] = useState(0);
  const [evaluation, setEvaluation] = useState<{ type: 'cp' | 'mate'; value: number } | null>(null);
  const [lines, setLines] = useState<AnalysisLine[]>([]);
  const [engineLines, setEngineLines] = useState<Map<number, EngineInfo>>(new Map());
  const previousFenRef = useRef<string>('');
  const infoCleanupRef = useRef<(() => void) | null>(null);
  
  // Start/stop analysis
  useEffect(() => {
    if (!engine || !isInitialized || !analyzing) {
      if (engine && isInitialized) {
        engine.stop();
      }
      return;
    }

    // Only restart analysis if FEN changed
    if (fen !== previousFenRef.current) {
      previousFenRef.current = fen;
      
      // Clear previous analysis
      setDepth(0);
      setEngineLines(new Map());
      setLines([]);
      setEvaluation(null);
      
      // Start new analysis
      engine.analyze(fen, 25).catch(error => {
        console.error('Analysis failed:', error);
      });
    }
  }, [fen, analyzing, engine, isInitialized]);

  // Subscribe to engine updates
  useEffect(() => {
    if (!engine || !isInitialized) {
      return;
    }

    const handleInfo = (info: EngineInfo) => {
      if (info.multipv) {
        setEngineLines(prev => {
          const newMap = new Map(prev);
          newMap.set(info.multipv, info);
          return newMap;
        });
        
        // Update depth
        if (info.multipv === 1) {
          setDepth(info.depth);
          
          // Update evaluation from line 1
          try {
            const chess = new Chess(fen);
            const isWhiteTurn = chess.turn() === 'w';
            const evalValue = info.score.value * (isWhiteTurn ? 1 : -1);
            setEvaluation({
              type: info.score.unit,
              value: evalValue
            });
          } catch (error) {
            console.error('Error updating evaluation:', error);
          }
        }
      }
    };

    // Clean up previous callbacks
    if (infoCleanupRef.current) {
      infoCleanupRef.current();
    }

    // Subscribe to engine updates
    infoCleanupRef.current = engine.onInfo(handleInfo);
    
    // Set up MultiPV for 3 lines
    engine.setMultiPV(3);

    return () => {
      if (infoCleanupRef.current) {
        infoCleanupRef.current();
        infoCleanupRef.current = null;
      }
    };
  }, [engine, isInitialized, fen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const infoCleanup = infoCleanupRef.current;
      
      if (infoCleanup) {
        infoCleanup();
      }
    };
  }, []);

  // Convert engine lines to AnalysisLine format
  useEffect(() => {
    const convertedLines: AnalysisLine[] = [];
    const chess = new Chess(fen);
    const isWhiteTurn = chess.turn() === 'w';

    for (let i = 1; i <= 3; i++) {
      const info = engineLines.get(i);
      if (info && info.pv) {
        const moves = info.pv.split(' ').filter(m => m.length >= 4);
        const san: string[] = [];
        const tempChess = new Chess(fen);

        // Convert UCI to SAN
        for (const move of moves.slice(0, 10)) { // Limit to 10 moves
          try {
            const from = move.substring(0, 2);
            const to = move.substring(2, 4);
            const promotion = move.length > 4 ? move[4] : undefined;
            
            const chessMove = tempChess.move({
              from,
              to,
              promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined
            });
            
            if (chessMove) {
              san.push(chessMove.san);
            } else {
              break;
            }
          } catch {
            break;
          }
        }

        if (san.length > 0) {
          // Adjust evaluation for black's perspective
          const evalValue = info.score.value * (isWhiteTurn ? 1 : -1);
          
          convertedLines.push({
            moves: moves.slice(0, san.length),
            evaluation: {
              type: info.score.unit,
              value: evalValue
            },
            depth: info.depth,
            san
          });
        }
      }
    }

    setLines(convertedLines);
    onAnalysisUpdate(convertedLines, evaluation, analyzing, depth);
  }, [engineLines, fen, evaluation, analyzing, depth, onAnalysisUpdate]);

  const formatEval = (evalData: { type: 'cp' | 'mate'; value: number }) => {
    if (evalData.type === 'mate') {
      return `M${Math.abs(evalData.value)}`;
    }
    const pawnValue = (evalData.value / 100).toFixed(2);
    return evalData.value >= 0 ? `+${pawnValue}` : pawnValue;
  };

  const getEvalBarHeight = () => {
    if (!evaluation) return 50;
    
    if (evaluation.type === 'mate') {
      return evaluation.value > 0 ? 100 : 0;
    }
    
    // Clamp centipawn evaluation between -1000 and +1000
    const clampedEval = Math.max(-1000, Math.min(1000, evaluation.value));
    // Convert to percentage (50% = 0, 100% = +10, 0% = -10)
    return 50 + (clampedEval / 20);
  };

  const toggleAnalysis = useCallback(() => {
    setAnalyzing(!analyzing);
  }, [analyzing]);

  // Show error state
  if (initializationError) {
    return (
      <Paper sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: '#2a2a2a',
        color: 'white',
        p: 2
      }}>
        <Alert 
          severity="error" 
          icon={<ErrorIcon />}
          sx={{ 
            backgroundColor: '#d32f2f',
            color: 'white',
            mb: 2
          }}
        >
          <Typography variant="subtitle2">Engine Initialization Failed</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {initializationError}
          </Typography>
        </Alert>
        
        <Typography variant="body2" sx={{ color: '#888' }}>
          Analysis features are not available. Please refresh the page to retry.
        </Typography>
      </Paper>
    );
  }

  // Show loading state
  if (isInitializing || !isInitialized) {
    return (
      <Paper sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: '#2a2a2a',
        color: 'white',
        p: 2,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <MemoryIcon sx={{ fontSize: 48, mb: 2, color: '#888' }} />
        <Typography variant="h6" sx={{ mb: 1 }}>Initializing Engine</Typography>
        <Typography variant="body2" sx={{ color: '#888', mb: 2 }}>Loading Stockfish...</Typography>
        <LinearProgress sx={{ width: '100%' }} />
      </Paper>
    );
  }

  return (
    <Paper sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#2a2a2a',
      color: 'white'
    }}>
      {/* Evaluation Bar and Score */}
      <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
        {/* Vertical evaluation bar */}
        <Box sx={{ 
          width: 40,
          height: 200,
          backgroundColor: '#1a1a1a',
          position: 'relative',
          borderRadius: 1,
          overflow: 'hidden'
        }}>
          <Box sx={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            height: `${getEvalBarHeight()}%`,
            backgroundColor: '#ffffff',
            transition: 'height 0.3s ease'
          }} />
        </Box>

        {/* Evaluation details */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            {evaluation ? formatEval(evaluation) : '0.00'}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MemoryIcon fontSize="small" />
            <Typography variant="body2">
              Depth: {depth}/25
            </Typography>
            <IconButton 
              size="small" 
              onClick={toggleAnalysis}
              sx={{ ml: 'auto' }}
            >
              {analyzing ? <StopIcon /> : <PlayArrowIcon />}
            </IconButton>
          </Box>
          
          {analyzing && (
            <LinearProgress 
              variant="determinate" 
              value={(depth / 25) * 100} 
              sx={{ mt: 1 }}
            />
          )}
        </Box>
      </Box>

      <Divider sx={{ backgroundColor: '#444' }} />

      {/* Best Lines */}
      <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
          Best Lines
        </Typography>
        
        <List dense>
          {lines.map((line, index) => (
            <ListItem key={index} disablePadding sx={{ mb: 1 }}>
              <Paper sx={{ 
                width: '100%', 
                p: 1, 
                backgroundColor: '#1a1a1a',
                '&:hover': { backgroundColor: '#333' }
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Chip 
                    label={formatEval(line.evaluation)}
                    size="small"
                    sx={{ 
                      backgroundColor: line.evaluation.value > 0 ? '#4caf50' : 
                                      line.evaluation.value < 0 ? '#f44336' : '#888',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  />
                  <Typography variant="caption" sx={{ color: '#888' }}>
                    depth {line.depth}
                  </Typography>
                </Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontFamily: 'monospace',
                    wordBreak: 'break-word'
                  }}
                >
                  {line.san.join(' ')}
                </Typography>
              </Paper>
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider sx={{ backgroundColor: '#444' }} />

      {/* Move History */}
      <Box sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
          Moves
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {moveHistory.length === 0 ? (
            <Typography variant="body2" sx={{ color: '#888' }}>
              Starting position
            </Typography>
          ) : (
            moveHistory.map((move, index) => (
              <React.Fragment key={index}>
                {index % 2 === 0 && (
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#888',
                      minWidth: '30px'
                    }}
                  >
                    {Math.floor(index / 2) + 1}.
                  </Typography>
                )}
                <ListItemButton
                  sx={{ 
                    p: 0.5, 
                    minWidth: '50px',
                    borderRadius: 0.5,
                    backgroundColor: index < currentMoveIndex ? '#3a3a3a' : 'transparent',
                    '&:hover': { backgroundColor: '#4a4a4a' }
                  }}
                  onClick={() => onGoToMove(index + 1)}
                >
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {move}
                  </Typography>
                </ListItemButton>
              </React.Fragment>
            ))
          )}
        </Box>
      </Box>
    </Paper>
  );
}