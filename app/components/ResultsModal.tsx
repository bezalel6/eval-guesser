
"use client";

import React from "react";
import { Modal, Box, Typography, Button, Fade } from "@mui/material";
import { GameState, formatEval, MAX_EVAL_CONST } from "../hooks/useGameReducer";

interface ResultsModalProps {
  state: GameState;
  onNextPuzzle: () => void;
}

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
  textAlign: 'center',
};

export default function ResultsModal({ state, onNextPuzzle }: ResultsModalProps) {
  const { phase, puzzle, userGuess } = state;
  const open = phase === 'result';

  const difference = Math.abs(userGuess - puzzle.Rating);
  let feedbackText = "";
  if (difference <= 50) feedbackText = "Perfect!";
  else if (difference <= 100) feedbackText = "Excellent!";
  else if (difference <= 200) feedbackText = "Great!";
  else if (difference <= 400) feedbackText = "Good.";
  else feedbackText = "Keep trying!";

  return (
    <Modal open={open} closeAfterTransition>
      <Fade in={open}>
        <Box sx={style}>
          <Typography variant="h4" component="h2" gutterBottom>
            {feedbackText}
          </Typography>
          
          {/* Simple text display for now, will add graphical gauge later */}
          <Box sx={{ my: 2 }}>
            <Typography>Computer Eval: {formatEval(puzzle.Rating)}</Typography>
            <Typography>Your Guess: {formatEval(userGuess)}</Typography>
          </Box>

          <Button 
            variant="contained" 
            onClick={onNextPuzzle}
            size="large"
          >
            Next Puzzle
          </Button>
        </Box>
      </Fade>
    </Modal>
  );
}
