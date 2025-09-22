"use client";

import { Box, Typography, Paper, Button } from "@mui/material";
import SkipNextIcon from '@mui/icons-material/SkipNext';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import type { StreakSession } from "../training/[id]/page";

interface StreakPanelProps {
  session: StreakSession;
  onSkip?: () => void;
  phase: 'guessing' | 'result' | 'loading' | 'solution-loading';
  failed?: boolean;
}

export default function StreakPanel({ session, onSkip, phase, failed }: StreakPanelProps) {
  const canSkip = session.skipsRemaining > 0 && phase === 'guessing';
  
  return (
    <Paper elevation={3} sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
      {/* Streak Display */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          {session.streak >= 3 && <LocalFireDepartmentIcon sx={{ fontSize: 40, color: 'orange' }} />}
          {session.streak}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Current Streak
        </Typography>
      </Box>

      {/* Best Streak */}
      {session.bestStreak > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Best: {session.bestStreak}
          </Typography>
        </Box>
      )}

      {/* Failure Message */}
      {failed && (
        <Box sx={{ 
          mb: 2, 
          p: 1.5, 
          borderRadius: 1,
          backgroundColor: 'error.dark',
          border: '2px solid',
          borderColor: 'error.main'
        }}>
          <Typography variant="h6" fontWeight="bold">
            Streak Ended!
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Final streak: {session.streak}
          </Typography>
        </Box>
      )}

      {/* Skip Button (Lichess style - only when guessing) */}
      {canSkip && (
        <Button
          variant="outlined"
          startIcon={<SkipNextIcon />}
          onClick={onSkip}
          fullWidth
          sx={{ mb: 2 }}
        >
          Skip ({session.skipsRemaining} left)
        </Button>
      )}

      {/* Puzzle Count */}
      <Box sx={{ borderTop: '1px solid #404040', pt: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Puzzles in streak
        </Typography>
        <Typography variant="h6">
          {session.puzzleHistory.length}
        </Typography>
      </Box>
    </Paper>
  );
}