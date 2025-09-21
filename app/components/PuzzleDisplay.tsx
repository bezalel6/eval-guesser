"use client";

import React, { useState, useCallback, useRef } from "react";
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

export default function PuzzleDisplay({ puzzle }: { puzzle: any }) {
  const [fen, setFen] = useState<string>(puzzle.FEN);
  const [currentFen, setCurrentFen] = useState<string>(puzzle.FEN);
  const [evaluation, setEvaluation] = useState(puzzle.Rating);
  const [userGuess, setUserGuess] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [puzzleId, setPuzzleId] = useState<string>(puzzle.PuzzleId);

  // Use ref for slider value to avoid re-renders
  const sliderValueRef = useRef(0);

  // Chess instance for move handling (pseudo-legal moves)
  const chessRef = useRef(new Chess());

  const fetchRandomPuzzle = useCallback(async () => {
    setLoading(true);
    setShowResult(false);
    setUserGuess(0);
    sliderValueRef.current = 0;

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
      } catch (e) {
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

  // Handle piece drops - pseudo-legal moves only (no validation)
  const onPieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      try {
        const newChess = new Chess(currentFen);
        const move = newChess.move({
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

  // Handle slider change (only update ref, not state)
  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    sliderValueRef.current = newValue as number;
  };

  // Handle slider commit (mouse up or keyboard release)
  const handleSliderCommit = (
    _event: React.SyntheticEvent | Event,
    newValue: number | number[]
  ) => {
    setUserGuess(newValue as number);
  };

  const handleSubmit = () => {
    const difference = Math.abs(userGuess - evaluation);
    const points = Math.max(0, 1000 - difference);
    setScore(score + points);
    setShowResult(true);
  };

  const handleNextPuzzle = () => {
    fetchRandomPuzzle();
  };

  const handleResetPosition = () => {
    setCurrentFen(fen);
    try {
      chessRef.current.load(fen);
    } catch (e) {
      chessRef.current = new Chess();
    }
  };

  // Optimized board options
  const boardOptions: React.ComponentProps<typeof Chessboard>["options"] = {
    position: currentFen,
    allowDragging: true,
    animationDurationInMs: 50,
    dragActivationDistance: 0,
    allowDragOffBoard: false,
    showAnimations: true,
    showNotation: true,
    onPieceDrop: (d) => onPieceDrop(d.sourceSquare, d.targetSquare),
  };

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
          value={userGuess}
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
}
