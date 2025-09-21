"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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

function App() {
  const [fen, setFen] = useState<string>("");
  const [currentFen, setCurrentFen] = useState<string>("");
  const [evaluation, setEvaluation] = useState(0);
  const [userGuess, setUserGuess] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [puzzleId, setPuzzleId] = useState<string>("");
  
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
      const puzzle = await response.json();

      if (!response.ok) {
        throw new Error("Failed to fetch puzzle");
      }

      console.log("Puzzle received:", puzzle);
      setFen(puzzle.FEN);
      setCurrentFen(puzzle.FEN);
      setPuzzleId(puzzle.PuzzleId);
      
      // Load position into chess instance
      try {
        chessRef.current.load(puzzle.FEN);
      } catch (e) {
        // If FEN is invalid for chess.js, create new instance
        chessRef.current = new Chess();
      }
      
      // For now, use a random evaluation
      const tempEval = Math.floor(Math.random() * 2000) - 1000;
      setEvaluation(tempEval);
    } catch (error) {
      console.error("Failed to fetch puzzle", error);
      const startingFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      setFen(startingFen);
      setCurrentFen(startingFen);
      setEvaluation(0);
      chessRef.current = new Chess();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRandomPuzzle();
  }, [fetchRandomPuzzle]);

  // Handle piece drops - pseudo-legal moves only (no validation)
  const onPieceDrop = useCallback((sourceSquare: string, targetSquare: string) => {
    // Just update the position without validation
    // This allows players to make any move to test their calculation
    try {
      const newChess = new Chess(currentFen);
      // Try to make the move legally first
      const move = newChess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // auto-promote to queen for simplicity
      });
      
      if (move) {
        // Legal move was made
        setCurrentFen(newChess.fen());
        return true;
      }
      
      // If not legal, allow pseudo-legal move by manually updating position
      // Get current position
      const piece = newChess.get(sourceSquare);
      if (piece) {
        newChess.remove(sourceSquare);
        newChess.put(piece, targetSquare);
        setCurrentFen(newChess.fen());
        return true;
      }
    } catch (e) {
      console.log("Move failed:", e);
    }
    return false;
  }, [currentFen]);

  // Handle slider change (only update ref, not state)
  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    sliderValueRef.current = newValue as number;
  };

  // Handle slider commit (mouse up or keyboard release)
  const handleSliderCommit = (_event: React.SyntheticEvent | Event, newValue: number | number[]) => {
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
  const boardOptions = {
    position: currentFen,
    allowDragging: true,
    animationDurationInMs: 150, // Faster animations
    dragActivationDistance: 0, // Instant drag response
    allowDragOffBoard: false,
    showAnimations: true,
    showNotation: true,
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
          <Chessboard 
            options={boardOptions}
            onPieceDrop={onPieceDrop}
          />
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

export default App;