'use client';

import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';

interface EvalBarProps {
  evaluation: { type: 'cp' | 'mate'; value: number } | null;
  height?: number;
  width?: number;
  showLabel?: boolean;
  stale?: boolean;
}

export default function EvalBar({ 
  evaluation, 
  height = 600, 
  width = 40,
  showLabel = false,
  stale = false
}: EvalBarProps) {
  const { whiteHeight, evalText } = useMemo(() => {
    if (!evaluation) {
      return { whiteHeight: 50, evalText: '0.00' };
    }
    
    let whiteHeight: number;
    let evalText: string;
    
    if (evaluation.type === 'mate') {
      // Mate in N moves
      whiteHeight = evaluation.value > 0 ? 100 : 0;
      evalText = `M${Math.abs(evaluation.value)}`;
    } else {
      // Centipawn evaluation
      // Clamp between -2000 and +2000 for better visual range
      const clampedEval = Math.max(-2000, Math.min(2000, evaluation.value));
      // Convert to percentage (50% = 0, 100% = +20 pawns, 0% = -20 pawns)
      whiteHeight = 50 + (clampedEval / 40);
      
      // Format as decimal pawns
      const pawnValue = (evaluation.value / 100).toFixed(2);
      evalText = evaluation.value >= 0 ? `+${pawnValue}` : pawnValue;
    }
    
    return { whiteHeight, evalText };
  }, [evaluation]);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      gap: showLabel ? 1 : 0
    }}>
      {/* Evaluation label */}
      {showLabel && (
        <Typography 
          variant="caption" 
          sx={{ 
            color: '#888',
            fontWeight: 'bold',
            opacity: stale ? 0.5 : 1,
            transition: 'opacity 0.2s'
          }}
        >
          {evalText}
        </Typography>
      )}
      
      {/* Vertical evaluation bar */}
      <Box sx={{ 
        width,
        height,
        backgroundColor: '#1a1a1a',
        position: 'relative',
        borderRadius: 1,
        overflow: 'hidden',
        border: '1px solid #333'
      }}>
        {/* Black advantage (top portion) */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          width: '100%',
          height: `${100 - whiteHeight}%`,
          backgroundColor: '#000000',
          transition: 'height 0.3s ease'
        }} />
        
        {/* White advantage (bottom portion) */}
        <Box sx={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          height: `${whiteHeight}%`,
          backgroundColor: '#ffffff',
          transition: 'height 0.3s ease'
        }} />
        
        {/* Center line indicator */}
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '1px',
          backgroundColor: '#666',
          transform: 'translateY(-50%)',
          opacity: 0.7
        }} />
      </Box>
    </Box>
  );
}