"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  Grid,
  Button,
  Chip
} from "@mui/material";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import TrophyIcon from '@mui/icons-material/EmojiEvents';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Header from "@/app/components/Header";

interface RushAttempt {
  id: string;
  puzzleId: string;
  userGuess: number;
  actualEval: number;
  isCorrect: boolean;
  attemptOrder: number;
}

interface RushResults {
  session: {
    id: string;
    mode: string;
    score: number;
    strikes: number;
    timeSpent?: number;
  };
  attempts: RushAttempt[];
  personalBest?: number;
  isNewRecord: boolean;
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  
  const [results, setResults] = useState<RushResults | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchResults = useCallback(async () => {
    try {
      const response = await fetch(`/api/rush/session/${sessionId}/results`);
      if (!response.ok) throw new Error("Results not found");
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Failed to fetch results:", error);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [sessionId, router]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const openAnalysis = (puzzleId: string, fen: string) => {
    window.open(`/analysis?fen=${encodeURIComponent(fen)}`, '_blank');
  };

  const startNewGame = () => {
    router.push("/dashboard");
  };

  if (loading || !results) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <Typography>Loading results...</Typography>
      </Container>
    );
  }

  return (
    <>
      <Header title="Puzzle Rush Results" />
      
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {/* Score Summary */}
        <Paper elevation={3} sx={{ p: 4, mb: 4, textAlign: 'center' }}>
          <Typography variant="h2" gutterBottom>
            {results.session.score}
          </Typography>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            Puzzles Solved
          </Typography>
          
          {results.isNewRecord && (
            <Chip 
              icon={<TrophyIcon />}
              label="NEW PERSONAL BEST!"
              color="warning"
              sx={{ mt: 2, fontSize: '1.1rem', py: 2, px: 1 }}
            />
          )}
          
          {results.personalBest && !results.isNewRecord && (
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
              Personal Best: {results.personalBest}
            </Typography>
          )}
        </Paper>

        {/* Puzzle Grid */}
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Puzzle Attempts
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Click any position to analyze it
          </Typography>
          
          <Grid container spacing={1}>
            {results.attempts.map((attempt) => (
              <Grid item key={attempt.id}>
                <Paper
                  elevation={1}
                  sx={{
                    p: 1.5,
                    cursor: 'pointer',
                    border: 2,
                    borderColor: attempt.isCorrect ? 'success.main' : 'error.main',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      transition: 'transform 0.2s',
                    },
                    minWidth: 60,
                    textAlign: 'center'
                  }}
                  onClick={() => {
                    // We need to fetch the puzzle FEN
                    fetch(`/api/puzzles/${attempt.puzzleId}`)
                      .then(res => res.json())
                      .then(puzzle => openAnalysis(attempt.puzzleId, puzzle.FEN));
                  }}
                >
                  <Typography variant="body2" fontWeight="bold">
                    #{attempt.attemptOrder}
                  </Typography>
                  {attempt.isCorrect ? (
                    <CheckCircleIcon color="success" fontSize="small" />
                  ) : (
                    <CancelIcon color="error" fontSize="small" />
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button 
            variant="contained" 
            size="large"
            startIcon={<RestartAltIcon />}
            onClick={startNewGame}
          >
            Play Again
          </Button>
          
          <Button 
            variant="outlined" 
            size="large"
            startIcon={<DashboardIcon />}
            onClick={() => router.push("/dashboard")}
          >
            Back to Dashboard
          </Button>
        </Box>
      </Container>
    </>
  );
}