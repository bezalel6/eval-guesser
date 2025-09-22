"use client";

import { useReducer } from 'react';
import type { ScoreBreakdown, Achievement } from '../utils/scoring';
import { calculateTotalScore, calculateStreakMultiplier, checkAchievements } from '../utils/scoring';

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

export type GamePhase = 'loading' | 'guessing' | 'result' | 'solution-loading' | 'best-move-challenge';

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
  currentTheme: string | null;
  // New scoring properties
  perfectStreak: number;
  perfectCount: number;
  bestMoveCount: number;
  totalPuzzles: number;
  currentScoreBreakdown: ScoreBreakdown | null;
  achievements: Achievement[];
  unlockedAchievementIds: string[];
  newAchievements: Achievement[];
  moveQuality: 'best' | 'good' | 'wrong' | null;
  comboMultiplier: number;
}

export type GameAction = 
  | { type: 'FETCH_NEW_PUZZLE_START' }
  | { type: 'FETCH_NEW_PUZZLE_SUCCESS'; payload: Puzzle }
  | { type: 'FETCH_NEW_PUZZLE_FAILURE' }
  | { type: 'FETCH_SOLUTION_START' }
  | { type: 'FETCH_SOLUTION_SUCCESS'; payload: { Moves: string } }
  | { type: 'FETCH_SOLUTION_FAILURE' }
  | { type: 'MOVE_PIECE'; payload: string } // fen
  | { type: 'RESET_POSITION' }
  | { type: 'FLIP_BOARD' }
  | { type: 'SLIDER_CHANGE'; payload: number } // value
  | { type: 'GUESS_SUBMITTED' }
  | { type: 'SHOW_BEST_MOVE' }
  | { type: 'SET_THEME'; payload: string | null }
  | { type: 'START_BEST_MOVE_CHALLENGE' }
  | { type: 'SUBMIT_BEST_MOVE'; payload: { from: string; to: string } }
  | { type: 'SKIP_BEST_MOVE' }
  | { type: 'ACHIEVEMENT_UNLOCKED'; payload: Achievement }
  | { type: 'CLEAR_NEW_ACHIEVEMENTS' };

const initialState: GameState = {
  puzzle: { PuzzleId: '', FEN: '', Moves: '', Rating: 0 },
  currentFen: '',
  userGuess: 0,
  sliderValue: 0,
  score: 0,
  streak: 0,
  bestStreak: 0,
  phase: 'loading' as GamePhase,
  boardFlipped: false,
  hasInteractedWithEval: false,
  bestMoveShown: false,
  currentTheme: null,
  // New scoring properties
  perfectStreak: 0,
  perfectCount: 0,
  bestMoveCount: 0,
  totalPuzzles: 0,
  currentScoreBreakdown: null,
  achievements: [],
  unlockedAchievementIds: [],
  newAchievements: [],
  moveQuality: null,
  comboMultiplier: 1.0,
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
        bestMoveShown: false,
        moveQuality: null,
        currentScoreBreakdown: null,
        newAchievements: [],
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
      
      // Calculate score breakdown
      const difference = Math.abs(state.userGuess - newPuzzleState.Rating);
      const scoreBreakdown = calculateTotalScore(
        difference,
        state.streak,
        state.perfectStreak,
        null // No move quality yet
      );
      
      // Update stats
      const isCorrect = difference <= 100; // Within 1 pawn
      const isPerfect = scoreBreakdown.accuracyTier === 'perfect';
      
      const newStreak = isCorrect ? state.streak + 1 : 0;
      const newPerfectStreak = isPerfect ? state.perfectStreak + 1 : 0;
      const newBestStreak = Math.max(state.bestStreak, newStreak);
      const newPerfectCount = state.perfectCount + (isPerfect ? 1 : 0);
      const newTotalPuzzles = state.totalPuzzles + 1;
      const newScore = state.score + scoreBreakdown.totalPoints;
      
      // Update combo multiplier
      const newComboMultiplier = calculateStreakMultiplier(newStreak);
      
      // Check for achievements
      const achievementStats = {
        perfectCount: newPerfectCount,
        streak: newStreak,
        perfectStreak: newPerfectStreak,
        bestMoveCount: state.bestMoveCount,
        totalPuzzles: newTotalPuzzles,
        totalScore: newScore,
      };
      
      const newUnlockedAchievements = checkAchievements(achievementStats, state.unlockedAchievementIds);
      const allUnlockedIds = [...state.unlockedAchievementIds, ...newUnlockedAchievements.map(a => a.id)];

      return {
        ...state,
        puzzle: newPuzzleState,
        score: newScore,
        streak: newStreak,
        bestStreak: newBestStreak,
        perfectStreak: newPerfectStreak,
        perfectCount: newPerfectCount,
        totalPuzzles: newTotalPuzzles,
        currentScoreBreakdown: scoreBreakdown,
        phase: 'best-move-challenge', // Go to best move challenge
        comboMultiplier: newComboMultiplier,
        achievements: [...state.achievements, ...newUnlockedAchievements],
        unlockedAchievementIds: allUnlockedIds,
        newAchievements: newUnlockedAchievements,
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
    case 'SET_THEME':
      return {
        ...state,
        currentTheme: action.payload,
      };
    case 'START_BEST_MOVE_CHALLENGE':
      return {
        ...state,
        phase: 'best-move-challenge',
        currentFen: state.puzzle.FEN, // Reset to original position
      };
    case 'SUBMIT_BEST_MOVE': {
      // Parse the best move from puzzle
      const bestMove = state.puzzle.Moves ? state.puzzle.Moves.split(' ')[0] : null;
      if (!bestMove) {
        return state;
      }
      
      // Convert UCI notation to from/to
      const bestFrom = bestMove.substring(0, 2);
      const bestTo = bestMove.substring(2, 4);
      
      // Check if move is correct
      const isCorrect = action.payload.from === bestFrom && action.payload.to === bestTo;
      const moveQuality: 'best' | 'good' | 'wrong' = isCorrect ? 'best' : 'wrong';
      
      // Recalculate score with move bonus
      const difference = Math.abs(state.userGuess - state.puzzle.Rating);
      const updatedScoreBreakdown = calculateTotalScore(
        difference,
        state.streak,
        state.perfectStreak,
        moveQuality
      );
      
      const additionalPoints = updatedScoreBreakdown.moveBonus;
      const newBestMoveCount = state.bestMoveCount + (isCorrect ? 1 : 0);
      const newScore = state.score + additionalPoints;
      
      // Check for move-related achievements
      const achievementStats = {
        perfectCount: state.perfectCount,
        streak: state.streak,
        perfectStreak: state.perfectStreak,
        bestMoveCount: newBestMoveCount,
        totalPuzzles: state.totalPuzzles,
        totalScore: newScore,
      };
      
      const newUnlockedAchievements = checkAchievements(achievementStats, state.unlockedAchievementIds);
      const allUnlockedIds = [...state.unlockedAchievementIds, ...newUnlockedAchievements.map(a => a.id)];
      
      return {
        ...state,
        moveQuality,
        bestMoveCount: newBestMoveCount,
        score: newScore,
        currentScoreBreakdown: updatedScoreBreakdown,
        phase: 'result',
        achievements: [...state.achievements, ...newUnlockedAchievements],
        unlockedAchievementIds: allUnlockedIds,
        newAchievements: [...state.newAchievements, ...newUnlockedAchievements],
      };
    }
    case 'SKIP_BEST_MOVE':
      return {
        ...state,
        phase: 'result',
        moveQuality: null,
      };
    case 'ACHIEVEMENT_UNLOCKED':
      return {
        ...state,
        achievements: [...state.achievements, action.payload],
        unlockedAchievementIds: [...state.unlockedAchievementIds, action.payload.id],
        newAchievements: [...state.newAchievements, action.payload],
      };
    case 'CLEAR_NEW_ACHIEVEMENTS':
      return {
        ...state,
        newAchievements: [],
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
    phase: 'guessing' as GamePhase,
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