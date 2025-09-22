"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Container, 
  Paper, 
  Typography, 
  LinearProgress,
  Grid
} from "@mui/material";
import Header from "@/app/components/Header";
import BoardWrapper from "@/app/components/BoardWrapper";
import EvalBar from "@/app/components/EvalBar";
import { useGameReducer } from "@/app/hooks/useGameReducer";
import type { Puzzle } from "@/app/hooks/useGameReducer";
import { GAME_CONFIG } from "@/lib/game-config";

interface RushSession {
  id: string;
  userId: string;
  mode: 'FIVE_MINUTE' | 'SURVIVAL';
  score: number;
  strikes: number;
  isActive: boolean;
  startedAt: Date;
  endedAt?: Date;
}

export default function RushPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const [session, setSession] = useState<RushSession | null>(null);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(GAME_CONFIG.FIVE_MINUTE_TIME);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout>();

  // Initialize game reducer with puzzle
  const { state, dispatch } = useGameReducer(
    puzzle || { PuzzleId: '', FEN: '', Moves: '', Rating: 0 },
    0,
    0
  );

  const fetchNextPuzzle = useCallback(async (currentScore: number) => {
    try {
      // Calculate target rating based on progress
      const targetRating = GAME_CONFIG.BASE_RATING + (currentScore * GAME_CONFIG.RATING_INCREMENT_PER_PUZZLE);
      const minRating = targetRating - GAME_CONFIG.RATING_RANGE;
      const maxRating = targetRating + GAME_CONFIG.RATING_RANGE;
      
      const response = await fetch(
        `/api/puzzles/by-rating?minRating=${minRating}&maxRating=${maxRating}&limit=50`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.puzzles && data.puzzles.length > 0) {
          const randomPuzzle = data.puzzles[Math.floor(Math.random() * data.puzzles.length)];
          
          // Fetch solution
          const solutionResponse = await fetch(`/api/puzzles/${randomPuzzle.PuzzleId}/solution`);
          if (solutionResponse.ok) {
            const solution = await solutionResponse.json();
            randomPuzzle.Moves = solution.Moves;
          }
          
          setPuzzle(randomPuzzle);
          dispatch({ type: 'FETCH_NEW_PUZZLE_SUCCESS', payload: randomPuzzle });
        }
      }
    } catch (error) {
      console.error("Failed to fetch puzzle:", error);
    }
  }, [dispatch]);

  const endSession = useCallback(async () => {
    try {
      await fetch("/api/rush/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action: "end" }),
      });
      router.push(`/rush/${sessionId}/results`);
    } catch (error) {
      console.error("Failed to end session:", error);
    }
  }, [sessionId, router]);

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/rush/session?id=${sessionId}`);
      if (!response.ok) throw new Error("Session not found");
      
      const sessionData = await response.json();
      setSession(sessionData);
      
      if (sessionData.isActive) {
        await fetchNextPuzzle(sessionData.score);
      } else {
        // Session ended, show results
        router.push(`/rush/${sessionId}/results`);
      }
    } catch (error) {
      console.error("Failed to fetch session:", error);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [sessionId, router, fetchNextPuzzle]);

  const handleGuess = useCallback(async () => {
    if (!puzzle || !session || isSubmitting) return;
    
    setIsSubmitting(true);
    const timeSpent = Date.now() - startTimeRef.current;
    
    try {
      const response = await fetch("/api/rush/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          puzzleId: puzzle.PuzzleId,
          userGuess: state.sliderValue,
          actualEval: puzzle.Rating,
          timeSpent,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSession(result.session);
        
        if (result.session.isActive) {
          // Continue to next puzzle
          startTimeRef.current = Date.now();
          await fetchNextPuzzle(result.session.score);
        } else {
          // Game ended
          router.push(`/rush/${sessionId}/results`);
        }
      }
    } catch (error) {
      console.error("Failed to submit guess:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [puzzle, session, state.sliderValue, sessionId, router, isSubmitting, fetchNextPuzzle]);

  // Fetch session and first puzzle
  useEffect(() => {
    fetchSession();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchSession]);

  // Timer for 5-minute mode
  useEffect(() => {
    if (session?.mode === 'FIVE_MINUTE' && session.isActive) {
      startTimeRef.current = Date.now();
      
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = GAME_CONFIG.FIVE_MINUTE_TIME - elapsed;
        
        if (remaining <= 0) {
          setTimeRemaining(0);
          endSession();
        } else {
          setTimeRemaining(remaining);
        }
      }, 100);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [session, endSession]);

  if (loading) {
    return (
      <>
        <Header title="Puzzle Rush" />
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography>Loading session...</Typography>
          </Paper>
        </Container>
      </>
    );
  }

  if (!session || !puzzle) {
    return (
      <>
        <Header title="Puzzle Rush" />
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography>Failed to load session</Typography>
          </Paper>
        </Container>
      </>
    );
  }

  return (
    <>
      <Header title="Puzzle Rush" />
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        {/* Progress bar for 5-minute mode */}
        {session.mode === 'FIVE_MINUTE' && (
          <LinearProgress 
            variant="determinate" 
            value={(timeRemaining / GAME_CONFIG.FIVE_MINUTE_TIME) * 100}
            sx={{ mb: 2, height: 8 }}
          />
        )}

        {/* Stats bar */}
        <Paper sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6">Score: {session.score}</Typography>
          {session.mode === 'SURVIVAL' && (
            <Typography variant="h6">
              Strikes: {session.strikes}/{GAME_CONFIG.MAX_STRIKES || 3}
            </Typography>
          )}
          {session.mode === 'FIVE_MINUTE' && (
            <Typography variant="h6">
              Time: {Math.floor(timeRemaining / 60000)}:{String(Math.floor((timeRemaining % 60000) / 1000)).padStart(2, '0')}
            </Typography>
          )}
        </Paper>

        {/* Game area */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <BoardWrapper 
              state={state}
              dispatch={dispatch}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <EvalBar
              state={state}
              dispatch={dispatch}
              onSubmit={handleGuess}
              isSubmitting={isSubmitting}
              hideHeader
              autoShowValue
            />
          </Grid>
        </Grid>
      </Container>
    </>
  );
}