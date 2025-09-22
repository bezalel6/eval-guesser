"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Container, CircularProgress, Box, Button } from "@mui/material";
import { useRouter, useParams } from "next/navigation";
import Header from "@/app/components/Header";
import Game from "@/app/components/Game";
import { Puzzle } from "@/app/hooks/useGameReducer";

// Lichess-style streak session stored in localStorage only
export interface StreakSession {
  streak: number;
  bestStreak: number;
  skipsRemaining: number;
  puzzleHistory: string[];
  startTime: number;
  lastUpdate: number;
}

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

// Load session from localStorage (Lichess pattern)
function loadStreakSession(): StreakSession | null {
  try {
    const stored = localStorage.getItem('evalGuesserStreak');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load streak session:', error);
  }
  return null;
}

// Save session to localStorage (Lichess pattern)
function saveStreakSession(session: StreakSession) {
  try {
    localStorage.setItem('evalGuesserStreak', JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save streak session:', error);
  }
}

// Clear session on streak failure (Lichess pattern)
function clearStreakSession() {
  localStorage.removeItem('evalGuesserStreak');
}

export default function TrainingPage() {
  const router = useRouter();
  const params = useParams();
  const puzzleId = params.id as string;
  
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<StreakSession | null>(null);

  // Load puzzle and restore session from localStorage (Lichess pattern)
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load puzzle
        const puzzleData = await fetchPuzzle(puzzleId);
        setPuzzle(puzzleData);
        
        // Load or create session (Lichess-style localStorage)
        let currentSession = loadStreakSession();
        if (!currentSession) {
          currentSession = {
            streak: 0,
            bestStreak: 0,
            skipsRemaining: 1, // Lichess gives 1 skip per streak
            puzzleHistory: [],
            startTime: Date.now(),
            lastUpdate: Date.now()
          };
          saveStreakSession(currentSession);
        }
        setSession(currentSession);
      } catch (error) {
        console.error('Failed to load puzzle:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [puzzleId]);

  // Navigate to new puzzle with clean URL (Lichess pattern)
  const navigateToNewPuzzle = useCallback(async (continueStreak: boolean = true) => {
    try {
      if (!continueStreak) {
        // Streak failed - clear session (Lichess pattern)
        clearStreakSession();
      }
      
      const session = loadStreakSession();
      const baseRating = 1500;
      const ratingRange = 200;
      
      // Progressive difficulty based on streak (Lichess pattern)
      let targetRating = baseRating;
      if (session && continueStreak) {
        targetRating = baseRating + (session.streak * 25); // Increase difficulty with streak
      }
      
      // Fetch puzzle near target rating
      const minRating = targetRating - ratingRange;
      const maxRating = targetRating + ratingRange;
      
      const response = await fetch(
        `/api/puzzles/by-rating?minRating=${minRating}&maxRating=${maxRating}&limit=50`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.puzzles && data.puzzles.length > 0) {
          const newPuzzle = data.puzzles[Math.floor(Math.random() * data.puzzles.length)];
          // Clean URL without parameters (Lichess pattern)
          router.push(`/training/${newPuzzle.PuzzleId}`);
          return;
        }
      }
      
      // Fallback to random
      const randomResponse = await fetch('/api/puzzles/random?includeSolution=true');
      if (randomResponse.ok) {
        const newPuzzle = await randomResponse.json();
        router.push(`/training/${newPuzzle.PuzzleId}`);
      }
    } catch (error) {
      console.error('Failed to fetch new puzzle:', error);
    }
  }, [router]);

  // Handle back to menu
  const handleBackToMenu = useCallback(() => {
    router.push('/');
  }, [router]);

  // Handle skip (Lichess pattern - 1 skip per streak)
  const handleSkip = useCallback(() => {
    if (session && session.skipsRemaining > 0) {
      const updatedSession = {
        ...session,
        skipsRemaining: session.skipsRemaining - 1,
        lastUpdate: Date.now()
      };
      setSession(updatedSession);
      saveStreakSession(updatedSession);
      navigateToNewPuzzle(true);
    }
  }, [session, navigateToNewPuzzle]);

  // Handle game state changes - strict failure mode
  const handleStateChange = useCallback((streak: number, failed: boolean) => {
    if (!session) return;

    if (failed) {
      // Streak ended - show result then clear (Lichess pattern)
      setTimeout(() => {
        clearStreakSession();
        navigateToNewPuzzle(false); // Start new streak
      }, 2000); // Brief delay to show failure
    } else {
      // Update session in localStorage
      const updatedSession: StreakSession = {
        ...session,
        streak,
        bestStreak: Math.max(session.bestStreak, streak),
        puzzleHistory: [...session.puzzleHistory, puzzleId],
        lastUpdate: Date.now()
      };
      setSession(updatedSession);
      saveStreakSession(updatedSession);
    }
  }, [session, puzzleId, navigateToNewPuzzle]);

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
          title="Puzzle Streak"
          onBackClick={handleBackToMenu}
        />
        <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Container>
      </>
    );
  }

  if (!puzzle || !session) {
    return (
      <>
        <Header 
          showBackButton
          title="Puzzle Streak"
          onBackClick={handleBackToMenu}
        />
        <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Box sx={{ textAlign: 'center' }}>
            <div>Unable to load puzzle</div>
            <Button 
              variant="contained" 
              onClick={() => navigateToNewPuzzle(false)} 
              sx={{ mt: 2 }}
            >
              Start New Streak
            </Button>
          </Box>
        </Container>
      </>
    );
  }

  return (
    <>
      <Header 
        showBackButton
        title="Puzzle Streak"
        onBackClick={handleBackToMenu}
      />
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Game 
          initialPuzzle={puzzle}
          onBackToMenu={handleBackToMenu}
          streakSession={session}
          onSkip={handleSkip}
          onStateChange={handleStateChange}
          onNextPuzzle={() => navigateToNewPuzzle(true)}
          strictMode={true} // Lichess-style strict mode
        />
      </Container>
    </>
  );
}