
"use client";

import React from "react";
import { Modal, Box, Typography, Button, Fade, Divider, Chip, LinearProgress } from "@mui/material";
import { GameState, formatEval } from "../hooks/useGameReducer";
import { motion } from "framer-motion";
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';

interface ResultsModalProps {
  state: GameState;
  onNextPuzzle: () => void;
}

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 450,
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
  textAlign: 'center',
};

export default function ResultsModal({ state, onNextPuzzle }: ResultsModalProps) {
  const { phase, puzzle, userGuess, currentScoreBreakdown, comboMultiplier, moveQuality } = state;
  const open = phase === 'result';
  
  if (!currentScoreBreakdown) return null;
  
  const difference = Math.abs(userGuess - puzzle.Rating);
  const accuracyPercentage = Math.max(0, 100 - (difference / 20)); // 0-100% accuracy

  return (
    <Modal open={open} closeAfterTransition>
      <Fade in={open}>
        <Box sx={style}>
          {/* Main Feedback with Emoji */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
              {currentScoreBreakdown.feedbackText}
            </Typography>
          </motion.div>
          
          {/* Evaluation Comparison */}
          <Box sx={{ my: 2, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Your Guess</Typography>
              <Typography variant="h6" fontWeight="bold">{formatEval(userGuess)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Computer Eval</Typography>
              <Typography variant="h6" fontWeight="bold" color="primary">{formatEval(puzzle.Rating)}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Accuracy</Typography>
              <Typography variant="h6" fontWeight="bold" color={accuracyPercentage >= 95 ? "success.main" : accuracyPercentage >= 75 ? "warning.main" : "error.main"}>
                {accuracyPercentage.toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={accuracyPercentage} 
              sx={{ mt: 1, height: 8, borderRadius: 4 }}
              color={accuracyPercentage >= 95 ? "success" : accuracyPercentage >= 75 ? "warning" : "error"}
            />
          </Box>

          {/* Score Breakdown */}
          <Box sx={{ my: 3, p: 2, border: '2px solid', borderColor: 'primary.main', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EmojiEventsIcon sx={{ mr: 1 }} /> Score Breakdown
            </Typography>
            
            <Box sx={{ textAlign: 'left' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Base Points</Typography>
                <Typography variant="body2" fontWeight="bold">+{currentScoreBreakdown.basePoints}</Typography>
              </Box>
              
              {currentScoreBreakdown.accuracyBonus > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Accuracy Bonus</Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">+{currentScoreBreakdown.accuracyBonus}</Typography>
                </Box>
              )}
              
              {comboMultiplier > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    <LocalFireDepartmentIcon sx={{ fontSize: 16, verticalAlign: 'text-bottom', mr: 0.5, color: 'orange' }} />
                    Combo Multiplier
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" color="warning.main">x{comboMultiplier.toFixed(1)}</Typography>
                </Box>
              )}
              
              {currentScoreBreakdown.perfectStreakBonus > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Perfect Streak!</Typography>
                  <Typography variant="body2" fontWeight="bold" color="secondary.main">+{currentScoreBreakdown.perfectStreakBonus}</Typography>
                </Box>
              )}
              
              {moveQuality && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    Best Move {moveQuality === 'best' ? '✓' : '✗'}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" color={moveQuality === 'best' ? 'success.main' : 'text.secondary'}>
                    +{currentScoreBreakdown.moveBonus}
                  </Typography>
                </Box>
              )}
              
              <Divider sx={{ my: 1 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Total</Typography>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                >
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    +{currentScoreBreakdown.totalPoints}
                  </Typography>
                </motion.div>
              </Box>
            </Box>
          </Box>

          {/* Streak indicator */}
          {state.streak > 0 && (
            <Box sx={{ mb: 2 }}>
              <Chip 
                icon={<LocalFireDepartmentIcon />}
                label={`${state.streak} Streak!`}
                color="warning"
                sx={{ fontWeight: 'bold' }}
              />
            </Box>
          )}

          <Button 
            variant="contained" 
            onClick={onNextPuzzle}
            size="large"
            fullWidth
            sx={{ textTransform: 'none', fontSize: '1.1rem', py: 1.5 }}
          >
            Next Puzzle →
          </Button>
        </Box>
      </Fade>
    </Modal>
  );
}
