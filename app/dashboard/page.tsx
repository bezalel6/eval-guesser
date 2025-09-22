"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  Container, 
  Paper, 
  Typography, 
  Button, 
  Box, 
  Grid,
  CircularProgress,
  Chip
} from "@mui/material";
import TimerIcon from '@mui/icons-material/Timer';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import TrophyIcon from '@mui/icons-material/EmojiEvents';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Header from "@/app/components/Header";

interface PersonalBest {
  mode: 'FIVE_MINUTE' | 'SURVIVAL';
  bestScore: number;
  achievedAt: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [personalBests, setPersonalBests] = useState<PersonalBest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchPersonalBests();
    }
  }, [status, router]);

  const fetchPersonalBests = async () => {
    try {
      const response = await fetch("/api/rush/leaderboard/personal");
      if (response.ok) {
        const data = await response.json();
        setPersonalBests(data);
      }
    } catch (error) {
      console.error("Failed to fetch personal bests:", error);
    } finally {
      setLoading(false);
    }
  };

  const startGame = async (mode: 'FIVE_MINUTE' | 'SURVIVAL') => {
    try {
      const response = await fetch("/api/rush/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });

      if (response.ok) {
        const session = await response.json();
        router.push(`/rush/${session.id}`);
      }
    } catch (error) {
      console.error("Failed to start game:", error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Container>
    );
  }

  const fiveMinuteBest = personalBests.find(pb => pb.mode === 'FIVE_MINUTE');
  const survivalBest = personalBests.find(pb => pb.mode === 'SURVIVAL');

  return (
    <>
      <Header title="Puzzle Rush" showBackButton onBackClick={() => router.push("/")} />
      
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {/* Welcome Section */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" gutterBottom>
            Welcome back, {session?.user?.name || session?.user?.email}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Choose your challenge mode
          </Typography>
        </Box>

        {/* Game Modes */}
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {/* 5-Minute Rush */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 4, 
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' }
              }}
              onClick={() => startGame('FIVE_MINUTE')}
            >
              <TimerIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              <Typography variant="h4" gutterBottom>
                5-Minute Rush
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Solve as many puzzles as you can in 5 minutes
              </Typography>
              
              {fiveMinuteBest && (
                <Chip 
                  icon={<TrophyIcon />}
                  label={`Personal Best: ${fiveMinuteBest.bestScore}`}
                  color="secondary"
                  sx={{ mb: 3 }}
                />
              )}
              
              <Button 
                variant="contained" 
                size="large"
                startIcon={<PlayArrowIcon />}
                fullWidth
              >
                Start 5-Minute Rush
              </Button>
            </Paper>
          </Grid>

          {/* Survival Mode */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 4, 
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' }
              }}
              onClick={() => startGame('SURVIVAL')}
            >
              <AllInclusiveIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
              <Typography variant="h4" gutterBottom>
                Survival Mode
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                No time limit - one wrong answer ends the run
              </Typography>
              
              {survivalBest && (
                <Chip 
                  icon={<TrophyIcon />}
                  label={`Personal Best: ${survivalBest.bestScore}`}
                  color="secondary"
                  sx={{ mb: 3 }}
                />
              )}
              
              <Button 
                variant="contained" 
                size="large"
                startIcon={<PlayArrowIcon />}
                fullWidth
                color="warning"
              >
                Start Survival Mode
              </Button>
            </Paper>
          </Grid>
        </Grid>

        {/* Leaderboard Link */}
        <Box sx={{ textAlign: 'center' }}>
          <Button 
            variant="outlined" 
            onClick={() => router.push("/leaderboard")}
          >
            View Global Leaderboard
          </Button>
        </Box>
      </Container>
    </>
  );
}