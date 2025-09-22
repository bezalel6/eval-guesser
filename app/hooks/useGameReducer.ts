"use client";

import { useReducer, useCallback } from 'react';
import type { Key } from 'chessground/types';

const MAX_EVAL = 2000;
const MATE_VALUE = 10000;

export interface Puzzle {
  PuzzleId: string;
  FEN: string;
  Moves: string;
  Rating: number;
  Themes?: string;
  OpeningTags?: string;
}

export type GamePhase = 'loading' | 'guessing' | 'result';

export interface GameState {
  puzzle: Puzzle;
  currentFen: string;
  userGuess: number; // In centipawns
  sliderValue: number; // In centipawns
  score: number;
  streak: number;
  bestStreak: number;
  phase: GamePhase;
  boardFlipped: boolean;
  hasInteractedWithEval: boolean;
  bestMoveShown: boolean;
}

export type GameAction = 
  | { type: 'FETCH_NEW_PUZZLE_START' }
  | { type: 'FETCH_NEW_PUZZLE_SUCCESS'; payload: Puzzle }
  | { type: 'FETCH_NEW_PUZZLE_FAILURE' }
  | { type: 'MOVE_PIECE'; payload: string } // fen
  | { type: 'RESET_POSITION' }
  | { type: 'FLIP_BOARD' }
  | { type: 'SLIDER_CHANGE'; payload: number } // value
  | { type: 'GUESS_SUBMITTED' }
  | { type: 'SHOW_BEST_MOVE' };

const initialState: GameState = {
  puzzle: { PuzzleId: '', FEN: '', Rating: 0 },
  currentFen: '',
  userGuess: 0,
  sliderValue: 0,
  score: 0,
  streak: 0,
  bestStreak: 0,
  phase: 'loading',
  boardFlipped: false,
  hasInteractedWithEval: false,
  bestMoveShown: false,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'FETCH_NEW_PUZZLE_START':
      return {
        ...state,
        phase: 'loading',
      };
    case 'FETCH_NEW_PUZZLE_SUCCESS':
      return {
        ...state,
        puzzle: action.payload,
        currentFen: action.payload.FEN,
        phase: 'guessing',
        sliderValue: 0,
        userGuess: 0,
        hasInteractedWithEval: false,
        bestMoveShown: false, // Reset on new puzzle
      };
    case 'FETCH_NEW_PUZZLE_FAILURE':
      return {
        ...state,
        phase: 'guessing', // Or some error state
      };
    case 'FETCH_SOLUTION_START':
      return {
        ...state,
        phase: 'solution-loading',
      };
    case 'FETCH_SOLUTION_FAILURE':
      return {
        ...state,
        phase: 'guessing', // Go back to guessing if solution fails
      };
    case 'FETCH_SOLUTION_SUCCESS': {
      const newPuzzleState = { ...state.puzzle, Moves: action.payload.Moves };
      // If we are showing the best move, we don't calculate score yet
      if (state.bestMoveShown) {
        return {
          ...state,
          puzzle: newPuzzleState,
          phase: 'guessing',
        };
      }

      // Otherwise, we are calculating the result of a guess
      const difference = Math.abs(state.userGuess - newPuzzleState.Rating);
      const points = Math.max(0, 1000 - difference);
      const newScore = state.score + points;
      
      const isCorrect = difference <= 100; // Within 1 pawn
      const newStreak = isCorrect ? state.streak + 1 : 0;
      const newBestStreak = Math.max(state.bestStreak, newStreak);

      return {
        ...state,
        puzzle: newPuzzleState,
        score: newScore,
        streak: newStreak,
        bestStreak: newBestStreak,
        phase: 'result',
      };
    }
    case 'MOVE_PIECE':
      return {
        ...state,
        currentFen: action.payload,
      };
    case 'RESET_POSITION':
      return {
        ...state,
        currentFen: state.puzzle.FEN,
        bestMoveShown: false, // Also reset here
      };
    case 'FLIP_BOARD':
      return {
        ...state,
        boardFlipped: !state.boardFlipped,
      };
    case 'SLIDER_CHANGE':
      return {
        ...state,
        sliderValue: action.payload,
        hasInteractedWithEval: true,
      };
    case 'GUESS_SUBMITTED': {
      return {
        ...state,
        userGuess: state.sliderValue,
        phase: 'solution-loading',
      };
    }
    case 'SHOW_BEST_MOVE':
      return {
        ...state,
        bestMoveShown: true,
        // The fetch logic will be handled in the component
        phase: state.puzzle.Moves ? state.phase : 'solution-loading',
      };
    default:
      return state;
  }
}

export function useGameReducer(initialPuzzle: Puzzle) {
  const [state, dispatch] = useReducer(gameReducer, {
    ...initialState,
    puzzle: initialPuzzle,
    currentFen: initialPuzzle.FEN,
    phase: 'guessing',
  });

  return { state, dispatch };
}

// Helper functions from old component, can be moved to a utils file later
export const formatEval = (centipawns: number) => {
  if (Math.abs(centipawns) >= MATE_VALUE - 1000) {
    const mateIn = Math.sign(centipawns) * (MATE_VALUE - Math.abs(centipawns));
    return centipawns > 0 ? `M${Math.abs(mateIn)}` : `-M${Math.abs(mateIn)}`;
  }
  const pawns = centipawns / 100;
  return pawns >= 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
};

export const MAX_EVAL_CONST = MAX_EVAL;