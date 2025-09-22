"use client";

import React, { useEffect } from "react";
import { useGameReducer, Puzzle } from "../hooks/useGameReducer";
import BoardLayout from "./BoardLayout";
import ScorePanel from "./ScorePanel";
import BoardWrapper from "./BoardWrapper";
import EvalBar from "./EvalBar";

import AchievementToast from "./AchievementToast";
import { Box } from "@mui/material";
import { playSound, getEvalResultSound } from "../lib/global-sounds";

interface GameProps {
  initialPuzzle: Puzzle;
  onUpdateHighScore?: (score: number) => void;
  onBackToMenu?: () => void;
  initialScore?: number;
  initialStreak?: number;
  initialTheme?: string;
  onStateChange?: (score: number, streak: number, theme?: string) => void;
  onNextPuzzle?: () => void;
}


export default function Game({ 
  initialPuzzle, 
  onUpdateHighScore, 
  onBackToMenu: _onBackToMenu,
  initialScore = 0,
  initialStreak = 0,
  initialTheme,
  onStateChange,
  onNextPuzzle 
}: GameProps) {
  const { state, dispatch } = useGameReducer(initialPuzzle, initialScore, initialStreak);

  const fetchSolution = async () => {
    if (state.puzzle.Moves) return; // Already have the solution

    dispatch({ type: 'FETCH_SOLUTION_START' });
    try {
      const response = await fetch(`/api/puzzles/${state.puzzle.PuzzleId}/solution`);
      if (!response.ok) throw new Error("Solution fetch failed");
      const solution = await response.json();
      dispatch({ type: 'FETCH_SOLUTION_SUCCESS', payload: solution });
    } catch (error) {
      console.error("Failed to fetch solution:", error);
      dispatch({ type: 'FETCH_SOLUTION_FAILURE' });
    }
  };

  const handleGuess = () => {
    playSound('click');
    dispatch({ type: 'GUESS_SUBMITTED' });
    fetchSolution(); // Fetch solution after guess is submitted
  };


  const fetchRandomPuzzle = React.useCallback(async () => {
    // If onNextPuzzle is provided, use it for navigation
    if (onNextPuzzle) {
      onNextPuzzle();
      return;
    }
    
    // Otherwise, fetch internally (for backwards compatibility)
    dispatch({ type: "FETCH_NEW_PUZZLE_START" });
    try {
      let newPuzzle;
      if (state.currentTheme) {
        const response = await fetch(`/api/puzzles/by-theme?theme=${state.currentTheme}&limit=50`);
        if (!response.ok) throw new Error("Failed to fetch by theme");
        const data = await response.json();
        if (data.puzzles && data.puzzles.length > 0) {
          newPuzzle = data.puzzles[Math.floor(Math.random() * data.puzzles.length)];
        } else {
          // Fallback to random if no puzzles found for the theme
          console.warn(`No puzzles found for theme: ${state.currentTheme}. Fetching a random puzzle.`);
          const randomResponse = await fetch("/api/puzzles/random");
          if (!randomResponse.ok) throw new Error("Failed to fetch random puzzle");
          newPuzzle = await randomResponse.json();
        }
      } else {
        const response = await fetch("/api/puzzles/random");
        if (!response.ok) throw new Error("Failed to fetch random puzzle");
        newPuzzle = await response.json();
      }
      dispatch({ type: "FETCH_NEW_PUZZLE_SUCCESS", payload: newPuzzle });
    } catch (error) {
      console.error("Failed to fetch new puzzle:", error);
      dispatch({ type: "FETCH_NEW_PUZZLE_FAILURE" });
    }
  }, [dispatch, state.currentTheme, onNextPuzzle]);

  // Initialize theme if provided
  useEffect(() => {
    if (initialTheme && state.currentTheme !== initialTheme) {
      dispatch({ type: 'SET_THEME', payload: initialTheme });
    }
  }, [initialTheme, state.currentTheme, dispatch]);

  // Call onStateChange when state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange(state.score, state.streak, state.currentTheme || undefined);
    }
  }, [state.score, state.streak, state.currentTheme, onStateChange]);

  // Track high score
  useEffect(() => {
    if (onUpdateHighScore) {
      onUpdateHighScore(state.score);
    }
  }, [state.score, onUpdateHighScore]);

  // Play sounds based on game state changes
  useEffect(() => {
    if (state.phase === 'guessing' && state.puzzle.PuzzleId) {
      // Play game start sound when new puzzle loads
      playSound('gameStart');
    }
  }, [state.puzzle.PuzzleId, state.phase]);

  // Play result sound when score breakdown is calculated
  useEffect(() => {
    if (state.currentScoreBreakdown) {
      const difference = Math.abs(state.userGuess - state.puzzle.Rating);
      const resultSound = getEvalResultSound(difference, 150); // Updated threshold
      playSound(resultSound);
    }
  }, [state.currentScoreBreakdown, state.userGuess, state.puzzle.Rating]);

  // Play achievement sound
  useEffect(() => {
    if (state.newAchievements.length > 0) {
      playSound('achievement');
    }
  }, [state.newAchievements]);

  // Auto-progress to next puzzle after showing results
  useEffect(() => {
    if (state.phase === 'result') {
      // Auto-progress to next puzzle after a short delay
      const timer = setTimeout(() => {
        fetchRandomPuzzle();
      }, 2000); // 2 second delay to view results
      
      return () => clearTimeout(timer);
    }
  }, [state.phase, fetchRandomPuzzle, dispatch]);

  

  const handleEvalChange = (value: number) => {
    dispatch({ type: 'SLIDER_CHANGE', payload: value });
  };

  
  
  return (
    <>
      <BoardLayout
        variant="game"
        scorePanel={<ScorePanel state={state} dispatch={dispatch} />}
        board={<BoardWrapper state={state} dispatch={dispatch} />}
        evalBar={
          <EvalBar
            mode={state.phase === 'result' ? 'result' : 'interactive'}
            value={state.sliderValue}
            onChange={handleEvalChange}
            onSubmit={handleGuess}
            disabled={state.phase !== 'guessing'}
            actualEval={state.phase === 'result' ? state.puzzle.Rating : undefined}
          />
        }
        controls={<Box sx={{ minHeight: 48 }} />}
      />
      <AchievementToast 
        achievements={state.newAchievements} 
        onClose={() => dispatch({ type: 'CLEAR_NEW_ACHIEVEMENTS' })}
      />
    </>
  );
}
