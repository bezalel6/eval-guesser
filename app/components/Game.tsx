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

  const fetchRandomPuzzle = React.useCallback(async () => {
    dispatch({ type: "FETCH_NEW_PUZZLE_START" });
    try {
      const response = await fetch("/api/puzzles/random");
      if (!response.ok) throw new Error("Failed to fetch");
      const newPuzzle = await response.json();
      dispatch({ type: "FETCH_NEW_PUZZLE_SUCCESS", payload: newPuzzle });
    } catch (error) {
      console.error("Failed to fetch new puzzle:", error);
      dispatch({ type: "FETCH_NEW_PUZZLE_FAILURE" });
    }
  }, [dispatch]);

  return (
    <>
      <GameLayout
        scorePanel={<ScorePanel state={state} dispatch={dispatch} />}
        board={<BoardWrapper state={state} dispatch={dispatch} />}
        slider={<EvaluationSlider state={state} dispatch={dispatch} />}
        controls={<Box sx={{ minHeight: 48, mt: 2 }} />}
      />
      <ResultsModal state={state} onNextPuzzle={fetchRandomPuzzle} />
    </>
  );
}