"use client";

import React, { useState, useCallback, useRef, useMemo } from "react";
import { Chessboard } from "react-chessboard";
import {
  Slider,
  Button,
  Typography,
  Container,
  Box,
  CircularProgress,
} from "@mui/material";
import { Chess } from "chess.js";

const MATE_SCORE = 10000;

interface Puzzle {
  FEN: string;
  Rating: number;
  PuzzleId: string;
}

const PuzzleDisplay = React.memo(function PuzzleDisplay({ puzzle }: { puzzle: Puzzle }) {
  const [fen, setFen] = useState<string>(puzzle.FEN);
  const [currentFen, setCurrentFen] = useState<string>(puzzle.FEN);
  const [evaluation, setEvaluation] = useState(puzzle.Rating);
  const [userGuess, setUserGuess] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [puzzleId, setPuzzleId] = useState<string>(puzzle.PuzzleId);

  // Local slider state for performance
  const [sliderValue, setSliderValue] = useState(0);

  // Chess instance for move handling (pseudo-legal moves)
  const chessRef = useRef(new Chess());

  const fetchRandomPuzzle = useCallback(async () => {
    setLoading(true);
    setShowResult(false);
    setUserGuess(0);
    setSliderValue(0);

    try {
      const response = await fetch("/api/puzzles/random");
      const newPuzzle = await response.json();

      if (!response.ok) {
        throw new Error("Failed to fetch puzzle");
      }

      console.log("Puzzle received:", newPuzzle);
      setFen(newPuzzle.FEN);
      setCurrentFen(newPuzzle.FEN);
      setPuzzleId(newPuzzle.PuzzleId);
      setEvaluation(newPuzzle.Rating);

      // Load position into chess instance
      try {
        chessRef.current.load(newPuzzle.FEN);
      } catch (_e) {
        // If FEN is invalid for chess.js, create new instance
        chessRef.current = new Chess();
      }
    } catch (error) {
      console.error("Failed to fetch puzzle", error);
      const startingFen =
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      setFen(startingFen);
      setCurrentFen(startingFen);
      setEvaluation(0);
      chessRef.current = new Chess();
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle piece drops - reuse chess instance for performance
  const onPieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      try {
        // Reuse existing chess instance
        chessRef.current.load(currentFen);
        const move = chessRef.current.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q",
        });

        if (move) {
          return true;
        }
        return false;
      } catch (e) {
        console.log("Move failed:", e);
      }
      return false;
    },
    [currentFen]
  );

  // Handle slider change - local state for performance
  const handleSliderChange = useCallback((_event: Event, newValue: number | number[]) => {
    setSliderValue(newValue as number);
  }, []);

  // Handle slider commit (mouse up or keyboard release)
  const handleSliderCommit = useCallback((
    _event: React.SyntheticEvent | Event,
    newValue: number | number[]
  ) => {
    const value = newValue as number;
    setSliderValue(value);
    setUserGuess(value);
  }, []);

  const handleSubmit = useCallback(() => {
    const difference = Math.abs(userGuess - evaluation);
    const points = Math.max(0, 1000 - difference);
    setScore(prevScore => prevScore + points);
    setShowResult(true);
  }, [userGuess, evaluation]);

  const handleNextPuzzle = useCallback(() => {
    fetchRandomPuzzle();
  }, [fetchRandomPuzzle]);

  const handleResetPosition = useCallback(() => {
    setCurrentFen(fen);
    try {
      chessRef.current.load(fen);
    } catch (_e) {
      chessRef.current = new Chess();
    }
  }, [fen]);

  // Memoized board options for performance
  const boardOptions = useMemo<React.ComponentProps<typeof Chessboard>["options"]>(() => ({
    position: currentFen,
    allowDragging: true,
    animationDurationInMs: 50,
    dragActivationDistance: 0,
    allowDragOffBoard: false,
    showAnimations: true,
    showNotation: true,
    onPieceDrop: (d) => onPieceDrop(d.sourceSquare, d.targetSquare),
  }), [currentFen, onPieceDrop]);

  return (
    <Container className="app-container">
      <Typography variant="h3" gutterBottom>
        Eval Guesser
      </Typography>
      {puzzleId && (
        <Typography variant="caption" gutterBottom>
          Puzzle ID: {puzzleId}
        </Typography>
      )}
      <Box className="board-container">
        {loading || !currentFen ? (
          <CircularProgress />
        ) : (
          <Chessboard options={boardOptions} />
        )}
      </Box>
      <Box className="controls-container">
        <Button
          variant="outlined"
          onClick={handleResetPosition}
          disabled={loading}
          size="small"
          sx={{ mb: 2 }}
        >
          Reset Position
        </Button>

        <Typography gutterBottom>Evaluation (Centipawns / Mate)</Typography>
        <Slider
          value={sliderValue}
          onChange={handleSliderChange}
          onChangeCommitted={handleSliderCommit}
          aria-labelledby="discrete-slider"
          valueLabelDisplay="auto"
          step={10}
          marks
          min={-MATE_SCORE}
          max={MATE_SCORE}
          disabled={showResult || loading}
        />
        {showResult && <Typography>Actual Evaluation: {evaluation}</Typography>}
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={showResult || loading}
            sx={{ mr: 2 }}
          >
            Submit Guess
          </Button>
          <Button
            variant="outlined"
            onClick={handleNextPuzzle}
            disabled={loading}
          >
            Next Puzzle
          </Button>
        </Box>
        <Typography variant="h5" sx={{ mt: 4 }}>
          Score: {score}
        </Typography>
      </Box>
    </Container>
  );
});

export default PuzzleDisplay;
