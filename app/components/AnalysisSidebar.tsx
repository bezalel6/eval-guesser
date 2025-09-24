'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  LinearProgress,
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
import { useEngineAnalysis } from '../hooks/useEngineAnalysis';
import type { AnalysisLine } from '../types/engine';

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
  onLineHover?: (lineIndex: number | null) => void;
}

export default function AnalysisSidebar({
  fen,
  onAnalysisUpdate,
  moveHistory,
  currentMoveIndex,
  onGoToMove,
  onLineHover
}: AnalysisSidebarProps) {
  const [analyzing, setAnalyzing] = useState(true);
  
  // Use the new server-side engine hook
  const { 
    state: analysisState, 
    startAnalysis, 
    stopAnalysis, 
    error: engineError 
  } = useEngineAnalysis(analyzing ? fen : undefined, {
    depth: 25,
    multiPV: 3,
    autoStart: analyzing
  });

  // Notify parent component of analysis updates
  useEffect(() => {
    onAnalysisUpdate(
      analysisState.lines,
      analysisState.evaluation,
      analysisState.isAnalyzing,
      analysisState.depth
    );
  }, [analysisState.lines, analysisState.evaluation, analysisState.isAnalyzing, analysisState.depth, onAnalysisUpdate]);

  // Handle analysis toggle
  const handleAnalysisToggle = useCallback(async () => {
    if (analyzing) {
      // Stop analysis
      await stopAnalysis();
      setAnalyzing(false);
    } else {
      // Start analysis
      setAnalyzing(true);
      if (fen) {
        await startAnalysis(fen);
      }
    }
  }, [analyzing, fen, startAnalysis, stopAnalysis]);

  // Handle FEN changes when analysis is enabled
  useEffect(() => {
    if (analyzing && fen && analysisState.sessionId) {
      startAnalysis(fen);
    }
  }, [fen, analyzing, startAnalysis, analysisState.sessionId]);

  const formatEvaluation = (evaluation: { type: 'cp' | 'mate'; value: number } | null) => {
    if (!evaluation) return '0.0';
    if (evaluation.type === 'mate') {
      return `M${Math.abs(evaluation.value)}`;
    }
    return (evaluation.value / 100).toFixed(1);
  };

  const getEvaluationColor = (evaluation: { type: 'cp' | 'mate'; value: number } | null) => {
    if (!evaluation) return 'text.secondary';
    if (evaluation.type === 'mate') {
      return evaluation.value > 0 ? '#81b64c' : '#f44336';
    }
    const absEval = Math.abs(evaluation.value / 100);
    if (absEval < 1) return 'text.secondary';
    if (absEval < 3) return evaluation.value > 0 ? '#81b64c' : '#ff9800';
    return evaluation.value > 0 ? '#4caf50' : '#f44336';
  };

  if (engineError && !analysisState.isConnected) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="body2">Engine Error: {engineError}</Typography>
        </Alert>
      </Paper>
    );
  }

  if (!analysisState.isConnected && analysisState.isAnalyzing && analyzing) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <MemoryIcon color="primary" />
          <Typography variant="body2">Connecting to analysis engine...</Typography>
        </Box>
        <LinearProgress sx={{ mt: 2 }} />
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
      {/* Engine Status */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MemoryIcon sx={{ color: analyzing ? '#4caf50' : 'text.secondary' }} />
            <Typography variant="h6">Engine Analysis</Typography>
          </Box>
          <IconButton 
            onClick={handleAnalysisToggle}
            color={analyzing ? "primary" : "default"}
          >
            {analyzing ? <StopIcon /> : <PlayArrowIcon />}
          </IconButton>
        </Box>
        
        {analysisState.isAnalyzing && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Depth {analysisState.depth}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 'bold',
                  color: getEvaluationColor(analysisState.evaluation)
                }}
              >
                {formatEvaluation(analysisState.evaluation)}
              </Typography>
            </Box>
            <LinearProgress variant="indeterminate" sx={{ height: 2 }} />
          </Box>
        )}

        {(analysisState.error || engineError) && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="body2">{analysisState.error || engineError}</Typography>
          </Alert>
        )}
      </Paper>

      {/* Move History */}
      <Paper sx={{ p: 2, flex: '0 0 auto' }}>
        <Typography variant="h6" gutterBottom>Move History</Typography>
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 0.5,
          maxHeight: 120,
          overflowY: 'auto'
        }}>
          {moveHistory.map((move, index) => (
            <Chip
              key={index}
              label={`${Math.floor(index / 2) + 1}${index % 2 === 0 ? '.' : '...'} ${move}`}
              size="small"
              color={index === currentMoveIndex - 1 ? "primary" : "default"}
              onClick={() => onGoToMove(index + 1)}
              sx={{ cursor: 'pointer' }}
            />
          ))}
          {moveHistory.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Start position
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Analysis Lines */}
      <Paper sx={{ p: 2, flex: '1 1 auto', overflow: 'hidden' }}>
        <Typography variant="h6" gutterBottom>Top Lines</Typography>
        <List sx={{ overflow: 'auto', maxHeight: 'calc(100vh - 500px)' }}>
          {analysisState.lines.map((line, index) => (
            <ListItem 
              key={index} 
              disablePadding
              onMouseEnter={() => onLineHover?.(index)}
              onMouseLeave={() => onLineHover?.(null)}
            >
              <ListItemButton sx={{ py: 1 }}>
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 'bold',
                        color: getEvaluationColor(line.evaluation)
                      }}
                    >
                      {formatEvaluation(line.evaluation)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      d={line.depth}
                    </Typography>
                  </Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      wordBreak: 'break-word'
                    }}
                  >
                    {line.san?.slice(0, 5).join(' ') || line.moves.slice(0, 5).join(' ')}
                    {(line.san?.length || line.moves.length) > 5 && '...'}
                  </Typography>
                </Box>
              </ListItemButton>
            </ListItem>
          ))}
          {analysisState.lines.length === 0 && !analysisState.isAnalyzing && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
              {analyzing ? 'Waiting for analysis...' : 'Analysis paused'}
            </Typography>
          )}
        </List>
      </Paper>
    </Box>
  );
}