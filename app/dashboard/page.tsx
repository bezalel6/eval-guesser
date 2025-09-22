"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  Container, 
  Paper, 
  Typography, 
  Button, 
  Grid,
  Box,
  CircularProgress
} from "@mui/material";
import Header from "@/app/components/Header";
import TimerIcon from '@mui/icons-material/Timer';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <>
        <Header title="Dashboard" />
        <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
          <CircularProgress />
        </Container>
      </>
    );
  }

  if (!session) {
    return null;
  }

  const handleStartRush = async (mode: 'FIVE_MINUTE' | 'SURVIVAL') => {
    try {
      const response = await fetch("/api/rush/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/rush/${data.id}`);
      }
    } catch (error) {
      console.error("Failed to start rush:", error);
    }
  };

  return (
    <>
      <Header title="Dashboard" />
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Welcome, {session.user?.name || "Player"}!
        </Typography>

        <Typography variant="h6" sx={{ mt: 4, mb: 3, textAlign: 'center' }}>
          Choose Your Game Mode
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper 
              sx={{ 
                p: 4, 
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                }
              }}
              onClick={() => handleStartRush('FIVE_MINUTE')}
            >
              <TimerIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                5-Minute Rush
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Race against time! Solve as many puzzles as you can in 5 minutes.
              </Typography>
              <Button variant="contained" size="large" fullWidth>
                Start 5-Minute Rush
              </Button>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper 
              sx={{ 
                p: 4, 
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                }
              }}
              onClick={() => handleStartRush('SURVIVAL')}
            >
              <AllInclusiveIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Survival Mode
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                No time limit, but one wrong answer ends your run. How far can you go?
              </Typography>
              <Button variant="contained" size="large" fullWidth>
                Start Survival Mode
              </Button>
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            variant="outlined"
            onClick={() => router.push("/analysis")}
          >
            Practice with Analysis Board
          </Button>
        </Box>
      </Container>
    </>
  );
}