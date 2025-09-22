
"use client";

import { Box, Typography, Paper, Select, MenuItem, FormControl, InputLabel, SelectChangeEvent, Chip, LinearProgress, Button, Divider } from "@mui/material";
import { GameState, GameAction, formatEval } from "../hooks/useGameReducer";
import { motion, AnimatePresence } from "framer-motion";
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import StarIcon from '@mui/icons-material/Star';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import { useRouter } from 'next/navigation';

const THEMES = [
  'All',
  'opening',
  'middlegame',
  'endgame',
  'mate',
  'pin',
  'fork',
  'skewer',
  'x-ray',
  'discoveredAttack',
];

interface ScorePanelProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export default function ScorePanel({ state, dispatch }: ScorePanelProps) {
  const { 
    score, 
    streak, 
    bestStreak, 
    currentTheme,
    comboMultiplier,
    perfectStreak,
    totalPuzzles,
    achievements,
    phase,
    puzzle,
    userGuess,
    currentScoreBreakdown
  } = state;
  const router = useRouter();
  
  const showResult = phase === 'result';
  const difference = showResult ? Math.abs(userGuess - puzzle.Rating) : 0;
  const isCorrect = difference <= 100;

  const handleThemeChange = (event: SelectChangeEvent<string>) => {
    const theme = event.target.value === 'All' ? null : event.target.value;
    dispatch({ type: 'SET_THEME', payload: theme });
  };

  const handleAnalyze = () => {
    router.push(`/analysis?fen=${encodeURIComponent(puzzle.FEN)}`);
  };

  return (
    <Paper elevation={3} sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
      {/* Result Feedback when puzzle completed */}
      <AnimatePresence>
        {showResult && currentScoreBreakdown && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Box sx={{ 
              mb: 2, 
              p: 1.5, 
              borderRadius: 1,
              backgroundColor: isCorrect ? 'success.dark' : 'error.dark',
              border: '2px solid',
              borderColor: isCorrect ? 'success.main' : 'error.main'
            }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                {currentScoreBreakdown.feedbackText}
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Your guess:</Typography>
                <Typography variant="body2" fontWeight="bold">{formatEval(userGuess)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Actual:</Typography>
                <Typography variant="body2" fontWeight="bold" color="primary">{formatEval(puzzle.Rating)}</Typography>
              </Box>
              
              <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.2)' }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Points:</Typography>
                <Typography variant="body2" fontWeight="bold" color="warning.main">
                  +{currentScoreBreakdown.totalPoints}
                </Typography>
              </Box>
              
              <Button
                size="small"
                variant="outlined"
                startIcon={<QueryStatsIcon />}
                onClick={handleAnalyze}
                sx={{ mt: 1 }}
                fullWidth
              >
                Analyze Position
              </Button>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Score Header with animation */}
      <motion.div
        key={score}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 0.3 }}
      >
        <Typography variant="h3" gutterBottom fontWeight="bold">
          {score.toLocaleString()}
        </Typography>
      </motion.div>
      
      {/* Combo Multiplier */}
      {comboMultiplier > 1 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Chip
            icon={<LocalFireDepartmentIcon />}
            label={`${comboMultiplier.toFixed(1)}x Combo!`}
            color="warning"
            size="small"
            sx={{ mb: 2, fontWeight: 'bold' }}
          />
        </motion.div>
      )}
      
      {/* Streak Stats */}
      <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Current Streak</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {streak >= 3 && <LocalFireDepartmentIcon sx={{ fontSize: 20, color: 'orange', mr: 0.5 }} />}
            <Typography variant="h4" color={streak > 0 ? "primary" : "text.primary"}>
              {streak}
            </Typography>
          </Box>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Best Streak</Typography>
          <Typography variant="h5">{bestStreak}</Typography>
        </Box>
      </Box>
      
      {/* Perfect Streak Indicator */}
      {perfectStreak > 0 && (
        <Box sx={{ mb: 2 }}>
          <Chip
            icon={<StarIcon />}
            label={`${perfectStreak} Perfect${perfectStreak > 1 ? 's' : ''} in a row!`}
            color="secondary"
            size="small"
            sx={{ fontWeight: 'bold' }}
          />
        </Box>
      )}
      
      {/* Progress Stats */}
      <Box sx={{ borderTop: '1px solid #404040', pt: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" color="text.secondary">Puzzles Solved</Typography>
          <Typography variant="body2" fontWeight="bold">{totalPuzzles}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" color="text.secondary">Achievements</Typography>
          <Typography variant="body2" fontWeight="bold">
            <EmojiEventsIcon sx={{ fontSize: 16, verticalAlign: 'text-bottom', mr: 0.5, color: 'gold' }} />
            {achievements.length}
          </Typography>
        </Box>
        
        {/* Progress to next milestone */}
        {totalPuzzles < 100 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Progress to {totalPuzzles < 10 ? 10 : totalPuzzles < 50 ? 50 : 100} puzzles
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={totalPuzzles < 10 ? (totalPuzzles / 10) * 100 : totalPuzzles < 50 ? (totalPuzzles / 50) * 100 : (totalPuzzles / 100) * 100}
              sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
            />
          </Box>
        )}
      </Box>

      <FormControl fullWidth>
        <InputLabel id="theme-select-label">Theme</InputLabel>
        <Select
          labelId="theme-select-label"
          id="theme-select"
          value={currentTheme || 'All'}
          label="Theme"
          onChange={handleThemeChange}
        >
          {THEMES.map(theme => (
            <MenuItem key={theme} value={theme}>{theme}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </Paper>
  );
}
