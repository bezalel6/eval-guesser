'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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

interface AnalysisState {
  depth: number;
  evaluation: { type: 'cp' | 'mate'; value: number } | null;
  lines: AnalysisLine[];
  engineLines: Map<number, EngineInfo>;
  error: string | null;
  isLoading: boolean;
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
  
  // Consolidated analysis state to prevent partial updates
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    depth: 0,
    evaluation: null,
    lines: [],
    engineLines: new Map(),
    error: null,
    isLoading: false
  });

  // Request tracking to prevent race conditions
  const analysisRequestIdRef = useRef<string>('');
  const currentFenRef = useRef<string>('');
  const infoCleanupRef = useRef<(() => void) | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Generate unique request ID for each analysis
  const generateRequestId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Debounced analysis starter
  const debouncedStartAnalysis = useCallback((fenToAnalyze: string) => {
    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Cancel any existing analysis
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Set loading state immediately
    setAnalysisState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    // Debounce for 300ms
    debounceTimerRef.current = setTimeout(async () => {
      if (!engine || !isInitialized || !analyzing) {
        setAnalysisState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Create new abort controller and request ID
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const requestId = generateRequestId();
      analysisRequestIdRef.current = requestId;
      currentFenRef.current = fenToAnalyze;

      try {
        // Start analysis with comprehensive error handling
        await engine.analyze(fenToAnalyze, 25);
      } catch (error) {
        // Only handle error if this request is still current
        if (analysisRequestIdRef.current === requestId && !abortController.signal.aborted) {
          console.error('Analysis failed:', error);
          
          let errorMessage = 'Analysis failed. Please try again.';
          
          // Provide specific error messages based on error type
          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes('worker')) {
              errorMessage = 'Chess engine communication failed. Try refreshing the page.';
            } else if (message.includes('timeout')) {
              errorMessage = 'Analysis timed out. Position may be too complex.';
            } else if (message.includes('destroyed')) {
              errorMessage = 'Chess engine was terminated. Please refresh to restart.';
            } else if (message.includes('fen') || message.includes('position')) {
              errorMessage = 'Invalid chess position. Please reset the board.';
            }
          }
          
          setAnalysisState(prev => ({
            ...prev,
            error: errorMessage,
            isLoading: false
          }));
        }
      }
    }, 300);
  }, [engine, isInitialized, analyzing, generateRequestId]);

  // Effect to handle FEN changes with debouncing
  useEffect(() => {
    if (!fen || fen === currentFenRef.current) {
      return;
    }

    // Reset analysis state for new position
    setAnalysisState({
      depth: 0,
      evaluation: null,
      lines: [],
      engineLines: new Map(),
      error: null,
      isLoading: false
    });

    if (analyzing) {
      debouncedStartAnalysis(fen);
    }
  }, [fen, analyzing, debouncedStartAnalysis]);

  // Effect to start/stop analysis
  useEffect(() => {
    if (!engine || !isInitialized) {
      return;
    }

    if (analyzing && fen) {
      // Start analysis if not already running for this FEN
      if (currentFenRef.current !== fen) {
        debouncedStartAnalysis(fen);
      }
    } else {
      // Stop analysis
      engine.stop();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setAnalysisState(prev => ({ ...prev, isLoading: false }));
    }
  }, [analyzing, engine, isInitialized, fen, debouncedStartAnalysis]);

  // Subscribe to engine updates with request validation
  useEffect(() => {
    if (!engine || !isInitialized || !analyzing) {
      return;
    }

    const handleInfo = (info: EngineInfo) => {
      const currentRequestId = analysisRequestIdRef.current;
      const currentFen = currentFenRef.current;
      
      // Validate that this info is for the current analysis request
      if (!currentRequestId || !currentFen || currentFen !== fen) {
        return;
      }

      // Validate that the request hasn't been cancelled
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      if (info.multipv) {
        setAnalysisState(prev => {
          // Double-check we're still on the same request
          if (analysisRequestIdRef.current !== currentRequestId) {
            return prev;
          }

          try {
            const newEngineLines = new Map(prev.engineLines);
            newEngineLines.set(info.multipv, info);
            
            let newEvaluation = prev.evaluation;
            let newDepth = prev.depth;

            // Update depth and evaluation from line 1
            if (info.multipv === 1) {
              newDepth = info.depth;
              
              try {
                const chess = new Chess(currentFen);
                const isWhiteTurn = chess.turn() === 'w';
                
                // Validate score data
                if (!info.score || typeof info.score.value !== 'number') {
                  console.warn('Invalid score data received from engine:', info.score);
                  return prev;
                }
                
                const evalValue = info.score.value * (isWhiteTurn ? 1 : -1);
                newEvaluation = {
                  type: info.score.unit,
                  value: evalValue
                };
              } catch (error) {
                console.error('Error updating evaluation:', error);
                return {
                  ...prev,
                  error: 'Invalid chess position received from engine',
                  isLoading: false
                };
              }
            }

            return {
              ...prev,
              engineLines: newEngineLines,
              depth: newDepth,
              evaluation: newEvaluation,
              isLoading: false,
              error: null
            };
          } catch (error) {
            console.error('Error processing engine info:', error);
            return {
              ...prev,
              error: 'Error processing analysis data',
              isLoading: false
            };
          }
        });
      }
    };

    // Clean up previous callbacks
    if (infoCleanupRef.current) {
      infoCleanupRef.current();
    }

    // Subscribe to engine updates
    infoCleanupRef.current = engine.onInfo(handleInfo);
    
    // Set up MultiPV for 3 lines
    try {
      engine.setMultiPV(3);
    } catch (error) {
      console.error('Error setting MultiPV:', error);
      setAnalysisState(prev => ({
        ...prev,
        error: 'Engine configuration failed',
        isLoading: false
      }));
    }

    return () => {
      if (infoCleanupRef.current) {
        infoCleanupRef.current();
        infoCleanupRef.current = null;
      }
    };
  }, [engine, isInitialized, analyzing, fen]);

  // Convert engine lines to AnalysisLine format with memoization
  const convertedLines = useMemo(() => {
    if (!fen || analysisState.engineLines.size === 0) {
      return [];
    }

    const lines: AnalysisLine[] = [];
    
    try {
      const chess = new Chess(fen);
      const isWhiteTurn = chess.turn() === 'w';

      for (let i = 1; i <= 3; i++) {
        const info = analysisState.engineLines.get(i);
        if (info && info.pv && info.score) {
          try {
            const moves = info.pv.split(' ').filter(m => m.length >= 4);
            const san: string[] = [];
            const tempChess = new Chess(fen);

            // Convert UCI to SAN with validation
            for (const move of moves.slice(0, 10)) { // Limit to 10 moves
              try {
                // Validate move format
                if (move.length < 4) {
                  console.warn('Invalid move format:', move);
                  break;
                }

                const from = move.substring(0, 2);
                const to = move.substring(2, 4);
                const promotion = move.length > 4 ? move[4] : undefined;

                // Validate squares
                if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) {
                  console.warn('Invalid square format:', from, to);
                  break;
                }
                
                const chessMove = tempChess.move({
                  from,
                  to,
                  promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined
                });
                
                if (chessMove) {
                  san.push(chessMove.san);
                } else {
                  console.warn('Invalid move:', move);
                  break;
                }
              } catch (moveError) {
                console.warn('Error processing move:', move, moveError);
                break;
              }
            }

            if (san.length > 0) {
              // Validate score data
              if (typeof info.score.value !== 'number') {
                console.warn('Invalid score value:', info.score.value);
                continue;
              }

              // Adjust evaluation for black's perspective
              const evalValue = info.score.value * (isWhiteTurn ? 1 : -1);
              
              lines.push({
                moves: moves.slice(0, san.length),
                evaluation: {
                  type: info.score.unit,
                  value: evalValue
                },
                depth: info.depth || 0,
                san
              });
            }
          } catch (lineError) {
            console.warn('Error processing analysis line:', i, lineError);
            continue; // Skip this line but continue with others
          }
        }
      }
    } catch (error) {
      console.error('Error converting engine lines:', error);
      // Set error state if this is a critical failure
      setAnalysisState(prev => ({
        ...prev,
        error: 'Error processing analysis results'
      }));
      return [];
    }

    return lines;
  }, [fen, analysisState.engineLines]);

  // Update parent component with analysis results
  useEffect(() => {
    onAnalysisUpdate(
      convertedLines, 
      analysisState.evaluation, 
      analyzing && analysisState.isLoading, 
      analysisState.depth
    );
  }, [convertedLines, analysisState.evaluation, analyzing, analysisState.isLoading, analysisState.depth, onAnalysisUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      if (infoCleanupRef.current) {
        infoCleanupRef.current();
      }
    };
  }, []);

  const formatEval = useCallback((evalData: { type: 'cp' | 'mate'; value: number }) => {
    if (evalData.type === 'mate') {
      return `M${Math.abs(evalData.value)}`;
    }
    const pawnValue = (evalData.value / 100).toFixed(2);
    return evalData.value >= 0 ? `+${pawnValue}` : pawnValue;
  }, []);

  const getEvalBarHeight = useCallback(() => {
    if (!analysisState.evaluation) return 50;
    
    if (analysisState.evaluation.type === 'mate') {
      return analysisState.evaluation.value > 0 ? 100 : 0;
    }
    
    // Clamp centipawn evaluation between -1000 and +1000
    const clampedEval = Math.max(-1000, Math.min(1000, analysisState.evaluation.value));
    // Convert to percentage (50% = 0, 100% = +10, 0% = -10)
    return 50 + (clampedEval / 20);
  }, [analysisState.evaluation]);

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
      {/* Analysis Error Alert */}
      {analysisState.error && (
        <Alert 
          severity="error" 
          onClose={() => setAnalysisState(prev => ({ ...prev, error: null }))}
          sx={{ 
            mx: 2, 
            mt: 2,
            backgroundColor: '#d32f2f',
            color: 'white'
          }}
        >
          {analysisState.error}
        </Alert>
      )}

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
            {analysisState.evaluation ? formatEval(analysisState.evaluation) : '0.00'}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MemoryIcon fontSize="small" />
            <Typography variant="body2">
              Depth: {analysisState.depth}/25
            </Typography>
            <IconButton 
              size="small" 
              onClick={toggleAnalysis}
              sx={{ ml: 'auto' }}
              disabled={!engine || !isInitialized}
            >
              {analyzing ? <StopIcon /> : <PlayArrowIcon />}
            </IconButton>
          </Box>
          
          {(analyzing && analysisState.isLoading) && (
            <LinearProgress 
              variant="determinate" 
              value={(analysisState.depth / 25) * 100} 
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
        
        {analysisState.isLoading && convertedLines.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography variant="body2" sx={{ color: '#888' }}>
              Analyzing position...
            </Typography>
          </Box>
        ) : (
          <List dense>
            {convertedLines.map((line, index) => (
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
                    {line.san?.join(' ') || 'Calculating...'}
                  </Typography>
                </Paper>
              </ListItem>
            ))}
          </List>
        )}
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