"use client";

import React from "react";
import { useGameReducer, Puzzle } from "../hooks/useGameReducer";
import GameLayout from "./GameLayout";
import ScorePanel from "./ScorePanel";
import BoardWrapper from "./BoardWrapper";
import EvaluationSlider from "./EvaluationSlider";
import ResultsModal from "./ResultsModal"; // Import the new modal
import { Box } from "@mui/material";

interface GameProps {
  initialPuzzle: Puzzle;
}


export default function Game({ initialPuzzle }: GameProps) {
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

  const handleShowBestMove = () => {
    dispatch({ type: 'SHOW_BEST_MOVE' });
    if (!state.puzzle.Moves) {
      fetchSolution();
    }
  };

  const { state, dispatch } = useGameReducer(initialPuzzle);

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

  const fetchSolution = async () => {

  return (
    <>
      <GameLayout
        scorePanel={<ScorePanel state={state} dispatch={dispatch} />}
        board={<BoardWrapper state={state} dispatch={dispatch} onShowBestMove={handleShowBestMove} onSkip={fetchRandomPuzzle} />}
        slider={<EvaluationSlider state={state} dispatch={dispatch} onGuess={handleGuess} isBoardModified={state.currentFen !== state.puzzle.FEN} />}
        controls={<Box sx={{ minHeight: 48, mt: 2 }} />}
      />
      <ResultsModal state={state} onNextPuzzle={fetchRandomPuzzle} />
    </>
  );
}
