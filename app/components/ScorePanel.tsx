
"use client";

import { Box, Typography, Paper, Select, MenuItem, FormControl, InputLabel, SelectChangeEvent } from "@mui/material";
import { GameState, GameAction } from "../hooks/useGameReducer";

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
  const { score, streak, bestStreak, currentTheme } = state;

  const handleThemeChange = (event: SelectChangeEvent<string>) => {
    const theme = event.target.value === 'All' ? null : event.target.value;
    dispatch({ type: 'SET_THEME', payload: theme });
  };

  return (
    <Paper elevation={3} sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>Score</Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 3 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Streak</Typography>
          <Typography variant="h4" color={streak > 0 ? "primary" : "text.primary"}>{streak}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Best</Typography>
          <Typography variant="h5">{bestStreak}</Typography>
        </Box>
      </Box>
      <Box sx={{ borderTop: '1px solid #404040', pt: 2, mb: 2 }}>
        <Typography variant="caption" color="text.secondary">Total Score</Typography>
        <Typography variant="h5">{score}</Typography>
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
