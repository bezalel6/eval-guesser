"use client";

import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { GameState, GameAction, formatEval, MAX_EVAL_CONST } from "../hooks/useGameReducer";

interface EvaluationControlsProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  onGuess: () => void;
  isBoardModified: boolean;
}

export default function EvaluationControls({ 
  state, 
  dispatch, 
  onGuess, 
  isBoardModified: _isBoardModified 
}: EvaluationControlsProps) {
  const { sliderValue, hasInteractedWithEval, phase } = state;

  const handleRangeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SLIDER_CHANGE', payload: parseInt(event.target.value, 10) });
  };

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: '600px', 
      px: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      mt: 2
    }}>
      <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
        Your evaluation:
      </Typography>
      
      <input
        type="range"
        value={sliderValue}
        onChange={handleRangeChange}
        min={-MAX_EVAL_CONST}
        max={MAX_EVAL_CONST}
        step={10}
        disabled={phase !== 'guessing'}
        className={`eval-slider ${!hasInteractedWithEval ? 'eval-slider-inactive' : ''}`}
        style={{ width: '100%' }}
        aria-label="Evaluation slider"
      />
      
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5, mb: 2, minHeight: '3rem' }}>
        <Typography variant="h4" fontWeight="bold" color={hasInteractedWithEval ? "primary" : "text.secondary"}>
          {hasInteractedWithEval ? formatEval(sliderValue) : "Move slider to guess"}
        </Typography>
      </Box>

      {(phase === 'guessing' || phase === 'solution-loading') && hasInteractedWithEval && (
        <Button
          variant="contained"
          onClick={onGuess}
          size="large"
          sx={{ px: 6, py: 1.5, fontSize: '1.1rem' }}
          disabled={phase === 'solution-loading'}
        >
          {phase === 'solution-loading' ? 'Checking...' : 'Submit Evaluation'}
        </Button>
      )}
    </Box>
  );
}