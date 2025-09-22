"use client";

import React, { useEffect } from "react";
import { useGameReducer, Puzzle } from "../hooks/useGameReducer";
import GameLayout from "./GameLayout";
import ScorePanel from "./ScorePanel";
import BoardWrapper from "./BoardWrapper";
import EvaluationSlider from "./EvaluationSlider";
import BestMoveChallenge from "./BestMoveChallenge";
import AchievementToast from "./AchievementToast";
import { Box } from "@mui/material";
import { playSound, getEvalResultSound } from "../lib/global-sounds";

interface GameProps {
  initialPuzzle: Puzzle;
  onUpdateHighScore?: (score: number) => void;
  onBackToMenu?: () => void;
}


export default function Game({ initialPuzzle, onUpdateHighScore, onBackToMenu: _onBackToMenu }: GameProps) {
  const { state, dispatch } = useGameReducer(initialPuzzle);

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
  }, [dispatch, state.currentTheme]);

  // Fetch a new puzzle whenever the theme changes
  useEffect(() => {
    fetchRandomPuzzle();
  }, [state.currentTheme, fetchRandomPuzzle]);

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
      const resultSound = getEvalResultSound(difference, 100);
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
      // Auto-progress to best move challenge or next puzzle after a short delay
      const timer = setTimeout(() => {
        if (state.puzzle.Moves) {
          dispatch({ type: 'START_BEST_MOVE_CHALLENGE' });
        } else {
          // Skip best move challenge if no moves available
          fetchRandomPuzzle();
        }
      }, 2000); // 2 second delay to view results
      
      return () => clearTimeout(timer);
    }
  }, [state.phase, state.puzzle.Moves, fetchRandomPuzzle, dispatch]);

  // Auto-progress from best move challenge
  useEffect(() => {
    if (state.phase === 'best-move-challenge' && state.moveQuality !== null) {
      // After best move attempt, go to next puzzle
      const timer = setTimeout(() => {
        fetchRandomPuzzle();
      }, 1500); // 1.5 second delay
      
      return () => clearTimeout(timer);
    }
  }, [state.phase, state.moveQuality, fetchRandomPuzzle]);

  // Show best move challenge screen when in that phase
  if (state.phase === 'best-move-challenge') {
    return (
      <>
        <GameLayout
          scorePanel={<ScorePanel state={state} dispatch={dispatch} />}
          board={<BestMoveChallenge state={state} dispatch={dispatch} />}
          slider={<Box sx={{ minHeight: 100 }} />} // Empty space
          controls={<Box sx={{ minHeight: 48 }} />}
        />
        <AchievementToast 
          achievements={state.newAchievements} 
          onClose={() => dispatch({ type: 'CLEAR_NEW_ACHIEVEMENTS' })}
        />
      </>
    );
  }
  
  return (
    <>
      <GameLayout
        scorePanel={<ScorePanel state={state} dispatch={dispatch} />}
        board={<BoardWrapper state={state} dispatch={dispatch} />}
        slider={<EvaluationSlider state={state} dispatch={dispatch} onGuess={handleGuess} isBoardModified={state.currentFen !== state.puzzle.FEN} />}
        controls={<Box sx={{ minHeight: 48, mt: 2 }} />}
      />
      <AchievementToast 
        achievements={state.newAchievements} 
        onClose={() => dispatch({ type: 'CLEAR_NEW_ACHIEVEMENTS' })}
      />
    </>
  );
}
