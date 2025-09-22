'use client';

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Box, Typography, Button } from '@mui/material';

interface InteractiveEvalBarProps {
  value: number;
  onChange: (value: number) => void;
  onSubmit: () => void;
  disabled?: boolean;
  showResult?: boolean;
  actualEval?: number;
  height?: number;
  width?: number;
}

export default function InteractiveEvalBar({ 
  value,
  onChange,
  onSubmit,
  disabled = false,
  showResult = false,
  actualEval,
  height = 600,
  width = 40
}: InteractiveEvalBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const updateValueFromPosition = useCallback((clientY: number) => {
    if (!barRef.current || disabled) return;
    
    const rect = barRef.current.getBoundingClientRect();
    const relativeY = clientY - rect.top;
    const percentage = 1 - (relativeY / rect.height); // Invert: top = 100%, bottom = 0%
    
    // Convert percentage to centipawn value (-2000 to +2000)
    const cpValue = Math.round((percentage - 0.5) * 4000);
    const clampedValue = Math.max(-2000, Math.min(2000, cpValue));
    
    onChange(clampedValue);
  }, [disabled, onChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    setHasInteracted(true);
    updateValueFromPosition(e.clientY);
  }, [disabled, updateValueFromPosition]);

  useEffect(() => {
    if (!isDragging) return;

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
  }, [isDragging, updateValueFromPosition]);

  // Calculate bar heights
  const { userHeight, actualHeight, evalText, actualText } = useMemo(() => {
    // User's guess
    const clampedUser = Math.max(-2000, Math.min(2000, value));
    const userH = 50 + (clampedUser / 40);
    const userPawns = (value / 100).toFixed(2);
    const userT = value >= 0 ? `+${userPawns}` : userPawns;
    
    // Actual eval (if showing result)
    let actualH = 50;
    let actualT = '';
    if (showResult && actualEval !== undefined) {
      const clampedActual = Math.max(-2000, Math.min(2000, actualEval));
      actualH = 50 + (clampedActual / 40);
      const actualPawns = (actualEval / 100).toFixed(2);
      actualT = actualEval >= 0 ? `+${actualPawns}` : actualPawns;
    }
    
    return { 
      userHeight: userH, 
      actualHeight: actualH, 
      evalText: userT,
      actualText: actualT
    };
  }, [value, showResult, actualEval]);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      gap: 1
    }}>
      {/* Current evaluation display */}
      <Box sx={{ minHeight: '32px', textAlign: 'center' }}>
        {hasInteracted && (
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 'bold',
              color: showResult ? 'text.secondary' : 'primary.main'
            }}
          >
            {showResult ? 'Your guess: ' : ''}{evalText}
          </Typography>
        )}
        {showResult && actualText && (
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 'bold',
              color: 'success.main'
            }}
          >
            Actual: {actualText}
          </Typography>
        )}
      </Box>
      
      {/* Vertical evaluation bar */}
      <Box 
        ref={barRef}
        onMouseDown={handleMouseDown}
        sx={{ 
          width,
          height,
          backgroundColor: '#1a1a1a',
          position: 'relative',
          borderRadius: 1,
          overflow: 'hidden',
          border: '1px solid #444',
          cursor: disabled ? 'default' : (isDragging ? 'grabbing' : 'grab'),
          userSelect: 'none',
          '&:hover': !disabled ? {
            border: '1px solid #666'
          } : {}
        }}
      >
        {/* User's guess (white portion) */}
        <Box sx={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          height: `${userHeight}%`,
          backgroundColor: hasInteracted ? '#ffffff' : '#666',
          transition: isDragging ? 'none' : 'height 0.1s ease',
          opacity: showResult ? 0.5 : 1
        }} />
        
        {/* Actual evaluation (if showing result) */}
        {showResult && actualEval !== undefined && (
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
        
        {/* Center line (50% mark) */}
        <Box sx={{
          position: 'absolute',
          top: '50%',
          width: '100%',
          height: '1px',
          backgroundColor: '#666',
          transform: 'translateY(-50%)'
        }} />
        
        {/* Interactive hint */}
        {!hasInteracted && !disabled && (
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '4px 8px',
            borderRadius: 1,
            pointerEvents: 'none'
          }}>
            <Typography variant="caption" sx={{ color: 'white', whiteSpace: 'nowrap' }}>
              Drag to guess
            </Typography>
          </Box>
        )}
      </Box>
      
      {/* Submit button */}
      {!showResult && hasInteracted && (
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