"use client";

import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { GameState, GameAction, formatEval, MAX_EVAL_CONST } from "../hooks/useGameReducer";

interface EvaluationSliderProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export default function EvaluationSlider({ state, dispatch }: EvaluationSliderProps) {
  const { sliderValue, hasInteractedWithEval, phase } = state;

  const handleRangeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SLIDER_CHANGE', payload: parseInt(event.target.value, 10) });
  };

  const handleSubmit = () => {
    dispatch({ type: 'GUESS_SUBMITTED' });
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '600px', px: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
        <Typography variant="h4" fontWeight="bold" color={hasInteractedWithEval ? "primary" : "transparent"}>
          {hasInteractedWithEval ? formatEval(sliderValue) : "Guess"}
        </Typography>
      </Box>

      {phase === 'guessing' && hasInteractedWithEval && (
        <Button
          variant="contained"
          onClick={onGuess} // Use the new handler
          size="large"
          sx={{ px: 6, py: 1.5, fontSize: '1.1rem' }}
          disabled={phase === 'solution-loading'}
        >
          {phase === 'solution-loading' ? 'Checking...' : 'Submit Evaluation'}
        </Button>
      )}
    </Box>
  );
} </Box>
  );
}