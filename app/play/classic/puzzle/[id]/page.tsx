"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { Container, CircularProgress, Box } from "@mui/material";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import Header from "@/app/components/Header";
import Game from "@/app/components/Game";
import { Puzzle } from "@/app/hooks/useGameReducer";

async function fetchPuzzle(id: string): Promise<Puzzle | null> {
  try {
    const response = await fetch(`/api/puzzles/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch puzzle');
    }
    
    const puzzle = await response.json();
    
    // Also fetch the solution
    const solutionResponse = await fetch(`/api/puzzles/${id}/solution`);
    if (solutionResponse.ok) {
      const solution = await solutionResponse.json();
      puzzle.Moves = solution.Moves;
    }
    
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
    console.error('Failed to fetch puzzle:', error);
    return null;
  }
}

function PuzzleGameContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const puzzleId = params.id as string;
  
  // Extract state from URL searchParams
  const initialScore = parseInt(searchParams.get('score') || '0', 10);
  const initialStreak = parseInt(searchParams.get('streak') || '0', 10);
  const theme = searchParams.get('theme') || undefined;
  
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [highScore, setHighScore] = useState(0);

  // Load puzzle and high score
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const puzzleData = await fetchPuzzle(puzzleId);
        setPuzzle(puzzleData);
        
        const savedScore = localStorage.getItem('classicHighScore');
        if (savedScore) setHighScore(parseInt(savedScore));
      } catch (error) {
        console.error('Failed to load puzzle:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [puzzleId]);

  // Update high score
  const updateHighScore = useCallback((score: number) => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('classicHighScore', score.toString());
    }
  }, [highScore]);

  // Update URL with new state
  const updateUrlState = useCallback((newScore: number, newStreak: number, newTheme?: string) => {
    const params = new URLSearchParams();
    if (newScore > 0) params.set('score', newScore.toString());
    if (newStreak > 0) params.set('streak', newStreak.toString());
    if (newTheme) params.set('theme', newTheme);
    
    const newUrl = `/play/classic/puzzle/${puzzleId}${params.toString() ? '?' + params.toString() : ''}`;
    router.replace(newUrl);
  }, [puzzleId, router]);

  // Store the latest state from the Game component
  const [currentGameState, setCurrentGameState] = useState({ 
    score: initialScore, 
    streak: initialStreak, 
    theme: theme 
  });

  // Navigate to a new puzzle
  const navigateToNewPuzzle = useCallback(async (preserveState: boolean = true) => {
    try {
      // Fetch a random puzzle based on theme if set
      let url = '/api/puzzles/random?includeSolution=true';
      if (currentGameState.theme) {
        // Try to get puzzle by theme first
        const themeResponse = await fetch(`/api/puzzles/by-theme?theme=${currentGameState.theme}&limit=50`);
        if (themeResponse.ok) {
          const data = await themeResponse.json();
          if (data.puzzles && data.puzzles.length > 0) {
            const newPuzzle = data.puzzles[Math.floor(Math.random() * data.puzzles.length)];
            
            if (preserveState) {
              const params = new URLSearchParams();
              if (currentGameState.score > 0) params.set('score', currentGameState.score.toString());
              if (currentGameState.streak > 0) params.set('streak', currentGameState.streak.toString());
              if (currentGameState.theme) params.set('theme', currentGameState.theme);
              
              router.push(`/play/classic/puzzle/${newPuzzle.PuzzleId}${params.toString() ? '?' + params.toString() : ''}`);
            } else {
              router.push(`/play/classic/puzzle/${newPuzzle.PuzzleId}`);
            }
            return;
          }
        }
      }
      
      // Fallback to random puzzle
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch new puzzle');
      
      const newPuzzle = await response.json();
      
      if (preserveState) {
        const params = new URLSearchParams();
        if (currentGameState.score > 0) params.set('score', currentGameState.score.toString());
        if (currentGameState.streak > 0) params.set('streak', currentGameState.streak.toString());
        if (currentGameState.theme) params.set('theme', currentGameState.theme);
        
        router.push(`/play/classic/puzzle/${newPuzzle.PuzzleId}${params.toString() ? '?' + params.toString() : ''}`);
      } else {
        router.push(`/play/classic/puzzle/${newPuzzle.PuzzleId}`);
      }
    } catch (error) {
      console.error('Failed to fetch new puzzle:', error);
    }
  }, [router, currentGameState]);

  // Handle back to menu
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
          <CircularProgress />
        </Container>
      </>
    );
  }

  if (!puzzle) {
    return (
      <>
        <Header 
          showBackButton
          title="Classic Mode"
          onBackClick={handleBackToMenu}
        />
        <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Box sx={{ textAlign: 'center' }}>
            <div>Puzzle not found</div>
            <button onClick={() => navigateToNewPuzzle(false)} style={{ marginTop: '1rem' }}>
              Try Random Puzzle
            </button>
          </Box>
        </Container>
      </>
    );
  }

  return (
    <>
      <Header 
        showBackButton
        title={`Classic Mode - Puzzle #${puzzleId}`}
        onBackClick={handleBackToMenu}
      />
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Game 
          initialPuzzle={puzzle}
          onUpdateHighScore={updateHighScore}
          onBackToMenu={handleBackToMenu}
          initialScore={initialScore}
          initialStreak={initialStreak}
          initialTheme={theme}
          onStateChange={(score, streak, theme) => {
            setCurrentGameState({ score, streak, theme: theme || null });
            updateUrlState(score, streak, theme);
          }}
          onNextPuzzle={() => navigateToNewPuzzle(true)}
        />
      </Container>
    </>
  );
}

// Main component wrapped in Suspense for searchParams
export default function PuzzlePage() {
  return (
    <Suspense fallback={
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Container>
    }>
      <PuzzleGameContent />
    </Suspense>
  );
}