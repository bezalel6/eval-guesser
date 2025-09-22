"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Container, CircularProgress } from "@mui/material";

// Lichess-style /streak route that redirects to a random puzzle to start streak
export default function StreakRedirect() {
  const router = useRouter();

  useEffect(() => {
    const startNewStreak = async () => {
      try {
        // Clear any existing streak session
        localStorage.removeItem('evalGuesserStreak');
        
        // Fetch a random puzzle to start
        const response = await fetch('/api/puzzles/random?includeSolution=true');
        if (!response.ok) {
          throw new Error('Failed to fetch puzzle');
        }
        
        const puzzle = await response.json();
        
        if (puzzle && puzzle.PuzzleId) {
          // Redirect to clean training URL (Lichess pattern)
          router.replace(`/training/${puzzle.PuzzleId}`);
        } else {
          router.replace('/');
        }
      } catch (error) {
        console.error('Failed to start streak:', error);
        router.replace('/');
      }
    };

    startNewStreak();
  }, [router]);

  return (
    <Container maxWidth="lg" sx={{ 
      mt: 4, 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '60vh' 
    }}>
      <CircularProgress />
    </Container>
  );
}