"use client";

import { Box, Typography, Paper, Button, Divider } from "@mui/material";
import { GameState, GameAction, formatEval } from "../hooks/useGameReducer";
import { motion, AnimatePresence } from "framer-motion";
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import { useRouter } from 'next/navigation';

interface ScorePanelProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export default function ScorePanel({ state, dispatch }: ScorePanelProps) {
  const { 
    phase,
    puzzle,
    userGuess,
  } = state;
  const router = useRouter();
  
  const showResult = phase === 'result';
  const difference = showResult ? Math.abs(userGuess - puzzle.Rating) : 0;
  const isCorrect = difference <= 400; // Within 4 pawns (configurable threshold)

  const handleAnalyze = () => {
    router.push(`/analysis?fen=${encodeURIComponent(puzzle.FEN)}`);
  };

  return (
    <Paper elevation={3} sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
      {/* Result Feedback when puzzle completed */}
      <AnimatePresence>
        {showResult && (
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
                {isCorrect ? 'Correct!' : 'Incorrect'}
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
      
      {/* Simple status when guessing */}
      {!showResult && (
        <Box sx={{ py: 2 }}>
          <Typography variant="h6" gutterBottom>
            Guess the Evaluation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use the slider to make your guess
          </Typography>
        </Box>
      )}
    </Paper>
  );
}