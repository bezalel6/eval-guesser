import React, { useState, useEffect, useCallback } from "react";
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
import "./App.css";

const MATE_SCORE = 10000;

// Function to parse Lichess evaluation
const parseEvaluation = (evaluation: string): number => {
  if (evaluation.startsWith("#")) {
    const mateIn = parseInt(evaluation.substring(1), 10);
    const score = MATE_SCORE - Math.abs(mateIn) + 1;
    return evaluation.startsWith("#-") ? -score : score;
  }
  return parseInt(evaluation, 10);
};

function App() {
  const [fen, setFen] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState(0);
  const [userGuess, setUserGuess] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRandomPuzzle = useCallback(async () => {
    setLoading(true);
    setShowResult(false);
    setUserGuess(0);
    try {
      // Using a cors proxy to avoid CORS issues in development
      const response = await fetch(
        "https://cors-anywhere.herokuapp.com/https://lichess.org/api/puzzle/random"
      );
      const puzzle = await response.json();

      const game = new Chess();
      // The PGN from lichess is not standard, it may contain clock times.
      // We need to remove them before loading.
      const pgn = puzzle.game.pgn.replace(/\[%clk.*?\] */g, "");
      game.loadPgn(pgn);

      // The puzzle FEN is the state of the board before the puzzle solution begins.
      // We can get this by going back one move.
      game.undo();
      const puzzleFen = game.fen();

      setFen(puzzleFen);

      const puzzleEval = parseEvaluation(puzzle.puzzle.solution[0].eval);
      setEvaluation(puzzleEval);
    } catch (error) {
      console.error("Failed to fetch puzzle", error);
      setFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRandomPuzzle();
  }, [fetchRandomPuzzle]);

  const handleGuessChange = (event: Event, newValue: number | number[]) => {
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

  return (
    <Container className="app-container">
      <Typography variant="h3" gutterBottom>
        Eval Guesser
      </Typography>
      <Box className="board-container">
        {loading || !fen ? (
          <CircularProgress />
        ) : (
          <Chessboard
            {...({ position: fen, arePiecesDraggable: false } as any)}
          />
        )}
      </Box>
      <Box className="controls-container">
        <Typography gutterBottom>Evaluation (Centipawns / Mate)</Typography>
        <Slider
          value={userGuess}
          onChange={handleGuessChange}
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
