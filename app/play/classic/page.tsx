"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Container } from "@mui/material";
import Header from "@/app/components/Header";
import Game from "@/app/components/Game";
import { Puzzle } from "@/app/hooks/useGameReducer";
import { useRouter } from "next/navigation";

async function fetchInitialPuzzle(): Promise<Puzzle | null> {
  try {
    const response = await fetch('/api/puzzles/random?includeSolution=true');
    if (!response.ok) {
      throw new Error('Failed to fetch puzzle');
    }
    
    const puzzle = await response.json();
    
    if (!puzzle || !puzzle.PuzzleId || !puzzle.FEN || puzzle.Rating === undefined || !puzzle.Moves) {
      return null;
    }

    return {
      PuzzleId: puzzle.PuzzleId,
      FEN: puzzle.FEN,
      Moves: puzzle.Moves,
      Rating: puzzle.Rating,
      Themes: puzzle.Themes,
      OpeningTags: puzzle.OpeningTags
    };
  } catch (error) {
    console.error('Failed to fetch initial puzzle:', error);
    return null;
  }
}

export default function ClassicGamePage() {
  const router = useRouter();
  const [highScore, setHighScore] = useState(0);
  const [initialPuzzle, setInitialPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);

  // Load initial puzzle and high score
  useEffect(() => {
    const loadData = async () => {
      try {
        const puzzle = await fetchInitialPuzzle();
        setInitialPuzzle(puzzle);
        
        const savedScore = localStorage.getItem('classicHighScore');
        if (savedScore) setHighScore(parseInt(savedScore));
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Update high score when it changes
  const updateHighScore = (score: number) => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('classicHighScore', score.toString());
    }
  };

  // Handle navigation
  const handleBackToMenu = useCallback(() => {
    router.push('/');
  }, [router]);

  // Handle ESC key for back navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleBackToMenu();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBackToMenu]);

  if (loading) {
    return (
      <>
        <Header 
          showBackButton
          title="Classic Mode"
          onBackClick={handleBackToMenu}
        />
        <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div>Loading puzzle...</div>
        </Container>
      </>
    );
  }

  if (!initialPuzzle) {
    return (
      <>
        <Header 
          showBackButton
          title="Classic Mode"
          onBackClick={handleBackToMenu}
        />
        <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div>Failed to load puzzle. Please try refreshing the page.</div>
        </Container>
      </>
    );
  }

  return (
    <>
      <Header 
        showBackButton
        title="Classic Mode"
        onBackClick={handleBackToMenu}
      />
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Game 
          initialPuzzle={initialPuzzle}
          onUpdateHighScore={updateHighScore}
          onBackToMenu={handleBackToMenu}
        />
      </Container>
    </>
  );
}