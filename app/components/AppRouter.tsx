"use client";

import React, { useState, useEffect } from "react";
import { Container } from "@mui/material";
import Homepage from "./Homepage";
import Header from "./Header";
import Game from "./Game";
import { Puzzle } from "../hooks/useGameReducer";

type GameMode = 'home' | 'classic';

interface AppRouterProps {
  initialPuzzle: Puzzle;
}

export default function AppRouter({ initialPuzzle }: AppRouterProps) {
  const [currentMode, setCurrentMode] = useState<GameMode>('home');
  const [classicHighScore, setClassicHighScore] = useState(0);

  // Load high scores from localStorage
  useEffect(() => {
    const savedClassicScore = localStorage.getItem('classicHighScore');
    if (savedClassicScore) setClassicHighScore(parseInt(savedClassicScore));
  }, []);

  // Update high scores when they change
  const updateClassicHighScore = (score: number) => {
    if (score > classicHighScore) {
      setClassicHighScore(score);
      localStorage.setItem('classicHighScore', score.toString());
    }
  };

  // Add back button functionality
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentMode !== 'home') {
        setCurrentMode('home');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMode]);

  switch (currentMode) {
    case 'home':
      return (
        <>
          <Header />
          <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Homepage
              onClassicPlay={() => setCurrentMode('classic')}
              onQuickThinkPlay={() => {}} 
              classicBestScore={classicHighScore}
              quickThinkBestScore={0}
            />
          </Container>
        </>
      );
    
    case 'classic':
      return (
        <>
          <Header 
            showBackButton
            title="Classic Mode"
            onBackClick={() => setCurrentMode('home')}
          />
          <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Game 
              initialPuzzle={initialPuzzle}
              onUpdateHighScore={updateClassicHighScore}
              onBackToMenu={() => setCurrentMode('home')}
            />
          </Container>
        </>
      );
    
    default:
      return null;
  }
}