
"use client";

import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import { GameState, GameAction } from "../hooks/useGameReducer";

interface ScorePanelProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export default function ScorePanel({ state }: ScorePanelProps) {
  const { score, streak, bestStreak } = state;

  return (
    <Paper elevation={3} sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>Score</Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Streak</Typography>
          <Typography variant="h4" color={streak > 0 ? "primary" : "text.primary"}>{streak}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Best</Typography>
          <Typography variant="h5">{bestStreak}</Typography>
        </Box>
      </Box>
      <Box sx={{ borderTop: '1px solid #404040', pt: 2 }}>
        <Typography variant="caption" color="text.secondary">Total Score</Typography>
        <Typography variant="h5">{score}</Typography>
      </Box>
    </Paper>
  );
}
