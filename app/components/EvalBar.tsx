'use client';

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Box, Typography, Button } from '@mui/material';

interface EvalBarProps {
  // Mode determines the component behavior
  mode: 'display' | 'interactive' | 'result';
  
  // Evaluation data
  evaluation?: { type: 'cp' | 'mate'; value: number } | null;
  
  // Interactive mode props
  value?: number;
  onChange?: (value: number) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  actualEval?: number;
  
  // Display props
  height?: number;
  width?: number;
  showLabel?: boolean;
  stale?: boolean;
}

export default function EvalBar({ 
  mode,
  evaluation,
  value = 0,
  onChange,
  onSubmit,
  disabled = false,
  actualEval,
  height = 600,
  width = 40,
  showLabel = false,
  stale = false
}: EvalBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(true); // Always show eval

  // Interactive mode handlers
  const updateValueFromPosition = useCallback((clientY: number) => {
    if (!barRef.current || disabled || mode !== 'interactive') return;
    
    const rect = barRef.current.getBoundingClientRect();
    const relativeY = clientY - rect.top;
    const percentage = 1 - (relativeY / rect.height); // Invert: top = 100%, bottom = 0%
    
    // Convert percentage to centipawn value (-2000 to +2000)
    const cpValue = Math.round((percentage - 0.5) * 4000);
    const clampedValue = Math.max(-2000, Math.min(2000, cpValue));
    
    if (onChange) {
      onChange(clampedValue);
    }
  }, [disabled, onChange, mode]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled || mode !== 'interactive') return;
    e.preventDefault();
    setIsDragging(true);
    setHasInteracted(true);
    updateValueFromPosition(e.clientY);
  }, [disabled, updateValueFromPosition, mode]);

  useEffect(() => {
    if (!isDragging || mode !== 'interactive') return;

    const handleMouseMove = (e: MouseEvent) => {
      updateValueFromPosition(e.clientY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, updateValueFromPosition, mode]);

  // Calculate bar heights and text based on mode
  const { whiteHeight, actualHeight, evalText, actualText } = useMemo(() => {
    let whiteH: number;
    let actualH: number = 50;
    let evalT: string;
    let actualT: string = '';
    
    if (mode === 'display') {
      // Display mode - use evaluation prop
      if (!evaluation) {
        return { whiteHeight: 50, actualHeight: 50, evalText: '0.00', actualText: '' };
      }
      
      if (evaluation.type === 'mate') {
        // Mate in N moves
        whiteH = evaluation.value > 0 ? 100 : 0;
        evalT = `M${Math.abs(evaluation.value)}`;
      } else {
        // Centipawn evaluation
        // Clamp between -2000 and +2000 for better visual range
        const clampedEval = Math.max(-2000, Math.min(2000, evaluation.value));
        // Convert to percentage (50% = 0, 100% = +20 pawns, 0% = -20 pawns)
        whiteH = 50 + (clampedEval / 40);
        
        // Format as decimal pawns
        const pawnValue = (evaluation.value / 100).toFixed(2);
        evalT = evaluation.value >= 0 ? `+${pawnValue}` : pawnValue;
      }
    } else {
      // Interactive or result mode - use value prop
      const clampedUser = Math.max(-2000, Math.min(2000, value));
      whiteH = 50 + (clampedUser / 40);
      const userPawns = (value / 100).toFixed(2);
      evalT = value >= 0 ? `+${userPawns}` : userPawns;
      
      // Result mode - also show actual eval
      if (mode === 'result' && actualEval !== undefined) {
        const clampedActual = Math.max(-2000, Math.min(2000, actualEval));
        actualH = 50 + (clampedActual / 40);
        const actualPawns = (actualEval / 100).toFixed(2);
        actualT = actualEval >= 0 ? `+${actualPawns}` : actualPawns;
      }
    }
    
    return { 
      whiteHeight: whiteH, 
      actualHeight: actualH, 
      evalText: evalT,
      actualText: actualT
    };
  }, [mode, evaluation, value, actualEval]);

  // Determine container width based on mode
  const containerWidth = mode === 'interactive' || mode === 'result' ? 120 : Math.max(width, 40);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      gap: (mode === 'interactive' || mode === 'result') ? 1 : (showLabel ? 1 : 0),
      height: '100%',
      minWidth: containerWidth
    }}>
      {/* Evaluation label/display */}
      {(showLabel || mode === 'interactive' || mode === 'result') && (
        <Box sx={{ 
          minHeight: mode === 'interactive' || mode === 'result' ? '64px' : '32px', 
          display: 'flex', 
          alignItems: 'center',
          flexDirection: mode === 'result' ? 'column' : 'row',
          justifyContent: 'center',
          textAlign: 'center',
          gap: mode === 'result' ? 0.5 : 0
        }}>
          {/* Always show evaluation text */}
          {(mode === 'interactive' || mode === 'display' || mode === 'result') && (
            <Typography 
              variant="h6" 
              sx={{ 
                color: mode === 'display' ? (stale ? 'text.disabled' : 'text.primary') 
                     : mode === 'result' ? 'text.secondary' 
                     : 'primary.main',
                fontWeight: 'bold',
                opacity: mode === 'display' && stale ? 0.5 : 1,
                transition: 'opacity 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              {mode === 'result' ? 'Your: ' : ''}{evalText}
            </Typography>
          )}
          {/* Show actual evaluation in result mode */}
          {mode === 'result' && actualText && (
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 'bold',
                color: 'success.main',
                whiteSpace: 'nowrap'
              }}
            >
              Actual: {actualText}
            </Typography>
          )}
        </Box>
      )}
      
      {/* Vertical evaluation bar */}
      <Box 
        ref={barRef}
        onMouseDown={mode === 'interactive' ? handleMouseDown : undefined}
        sx={{ 
          width: mode === 'interactive' || mode === 'result' ? width : '100%',
          flex: 1,
          minHeight: mode === 'interactive' || mode === 'result' ? 400 : undefined,
          maxHeight: mode === 'interactive' || mode === 'result' ? height : undefined,
          backgroundColor: '#1a1a1a',
          position: 'relative',
          borderRadius: 1,
          overflow: 'hidden',
          border: mode === 'interactive' ? '1px solid #444' : '1px solid #333',
          cursor: mode === 'interactive' && !disabled ? (isDragging ? 'grabbing' : 'grab') : 'default',
          userSelect: 'none',
          '&:hover': mode === 'interactive' && !disabled ? {
            border: '1px solid #666'
          } : {}
        }}
      >
        {/* Black advantage (top portion) */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          width: '100%',
          height: `${100 - whiteHeight}%`,
          backgroundColor: '#000000',
          transition: mode === 'interactive' && isDragging ? 'none' : 'height 0.3s ease'
        }} />
        
        {/* White advantage (bottom portion) */}
        <Box sx={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          height: `${whiteHeight}%`,
          backgroundColor: mode === 'interactive' && hasInteracted ? '#ffffff' 
                         : mode === 'result' ? '#ffffff' 
                         : mode === 'interactive' ? '#666' 
                         : '#ffffff',
          transition: mode === 'interactive' && isDragging ? 'none' : 'height 0.1s ease',
          opacity: mode === 'result' ? 0.5 : 1
        }} />
        
        {/* Actual evaluation indicator (result mode only) */}
        {mode === 'result' && actualEval !== undefined && (
          <Box sx={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            height: `${actualHeight}%`,
            backgroundColor: 'transparent',
            borderTop: '3px solid #4caf50',
            boxSizing: 'border-box'
          }} />
        )}
        
        {/* Center line indicator - more visible */}
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '2px',
          backgroundColor: '#888',
          transform: 'translateY(-50%)',
          zIndex: 1,
          boxShadow: '0 0 4px rgba(255,255,255,0.3)'
        }} />
        
        {/* Removed "Drag to guess" hint - users can see the eval immediately */}
      </Box>
      
      {/* Submit button (interactive mode only) */}
      {mode === 'interactive' && onSubmit && (
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={disabled}
          size="large"
          sx={{ mt: 1, px: 4 }}
        >
          Submit
        </Button>
      )}
    </Box>
  );
}