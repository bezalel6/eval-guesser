
"use client";

import React, { useState, useEffect } from "react";
import { Container } from "@mui/material";
import PuzzleService from "@/app/lib/puzzle-service";
import Homepage from "@/app/components/Homepage";
import Header from "@/app/components/Header";
import Game from "@/app/components/Game";
import { Puzzle } from "@/app/hooks/useGameReducer";

type GameMode = 'home' | 'classic';

async function getInitialPuzzle(): Promise<Puzzle | null> {
  const puzzleService = PuzzleService.getInstance();
  const puzzle = await puzzleService.getRandomPuzzle({ includeSolution: true });

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
}

export default function Page() {
  const [currentMode, setCurrentMode] = useState<GameMode>('home');
  const [classicHighScore, setClassicHighScore] = useState(0);
  const [initialPuzzle, setInitialPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);

  // Load initial puzzle and high scores
  useEffect(() => {
    const loadData = async () => {
      try {
        const puzzle = await getInitialPuzzle();
        setInitialPuzzle(puzzle);
        
        const savedClassicScore = localStorage.getItem('classicHighScore');
        if (savedClassicScore) setClassicHighScore(parseInt(savedClassicScore));
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Update high scores when they change
  const updateClassicHighScore = (score: number) => {
    if (score > classicHighScore) {
      setClassicHighScore(score);
      localStorage.setItem('classicHighScore', score.toString());
    }
  };

  // Add back button functionality
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentMode !== 'home') {
        setCurrentMode('home');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMode]);

  if (loading) {
    return <div>Loading puzzle...</div>;
  }

  if (!initialPuzzle) {
    return <div>Failed to load puzzle. Please try refreshing the page.</div>;
  }

  switch (currentMode) {
    case 'home':
      return (
        <>
          <Header />
          <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Homepage
              onClassicPlay={() => setCurrentMode('classic')}
              onQuickThinkPlay={() => {}} 
              classicBestScore={classicHighScore}
              quickThinkBestScore={0}
            />
          </Container>
        </>
      );
    
    case 'classic':
      return (
        <>
          <Header 
            showBackButton
            title="Classic Mode"
            onBackClick={() => setCurrentMode('home')}
          />
          <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Game 
              initialPuzzle={initialPuzzle}
              onUpdateHighScore={updateClassicHighScore}
              onBackToMenu={() => setCurrentMode('home')}
            />
          </Container>
        </>
      );
    
    default:
      return null;
  }
}

// Force dynamic rendering to ensure a new puzzle is fetched on each visit
export const dynamic = "force-dynamic";
