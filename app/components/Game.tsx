"use client";

import React, { useEffect } from "react";
import { useGameReducer, Puzzle } from "../hooks/useGameReducer";
import GameLayout from "./GameLayout";
import ScorePanel from "./ScorePanel";
import BoardWrapper from "./BoardWrapper";
import EvaluationSlider from "./EvaluationSlider";
import ResultsModal from "./ResultsModal";
import BestMoveChallenge from "./BestMoveChallenge";
import AchievementToast from "./AchievementToast";
import Timer from "./Timer";
import { Box } from "@mui/material";

interface GameProps {
  initialPuzzle: Puzzle;
  onUpdateHighScore?: (score: number) => void;
  onBackToMenu?: () => void;
}


export default function Game({ initialPuzzle, onUpdateHighScore, onBackToMenu }: GameProps) {
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
        <ResultsModal state={state} onNextPuzzle={fetchRandomPuzzle} />
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
      <Timer startTime={state.timeStarted} phase={state.phase} />
      <ResultsModal state={state} onNextPuzzle={fetchRandomPuzzle} />
      <AchievementToast 
        achievements={state.newAchievements} 
        onClose={() => dispatch({ type: 'CLEAR_NEW_ACHIEVEMENTS' })}
      />
    </>
  );
}
