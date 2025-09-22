"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Container, CircularProgress } from "@mui/material";

export default function ClassicGameRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Fetch a random puzzle and redirect to it
    const redirectToPuzzle = async () => {
      try {
        const response = await fetch('/api/puzzles/random?includeSolution=true');
        if (!response.ok) {
          throw new Error('Failed to fetch puzzle');
        }
        
        const puzzle = await response.json();
        
        if (puzzle && puzzle.PuzzleId) {
          // Redirect to the specific puzzle page
          router.replace(`/play/classic/puzzle/${puzzle.PuzzleId}`);
        } else {
          // Fallback to home if no puzzle found
          router.replace('/');
        }
      } catch (error) {
        console.error('Failed to fetch initial puzzle:', error);
        router.replace('/');
      }
    };

    redirectToPuzzle();
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