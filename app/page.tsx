"use client";

import React, { useState, useEffect } from "react";
import { Container } from "@mui/material";
import Homepage from "@/app/components/Homepage";
import Header from "@/app/components/Header";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  const [classicHighScore, setClassicHighScore] = useState(0);
  const [quickThinkHighScore, setQuickThinkHighScore] = useState(0);

  // Load high scores on mount
  useEffect(() => {
    const savedClassicScore = localStorage.getItem('classicHighScore');
    if (savedClassicScore) setClassicHighScore(parseInt(savedClassicScore));
    
    const savedQuickScore = localStorage.getItem('quickThinkHighScore');
    if (savedQuickScore) setQuickThinkHighScore(parseInt(savedQuickScore));
  }, []);

  const handleClassicPlay = () => {
    // Lichess-style route - go to /streak to start new streak
    router.push('/streak');
  };

  const handleQuickThinkPlay = () => {
    // TODO: Implement quick think mode route when ready
    console.log('Quick Think mode coming soon!');
  };

  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Homepage
          onClassicPlay={handleClassicPlay}
          onQuickThinkPlay={handleQuickThinkPlay} 
          classicBestScore={classicHighScore}
          quickThinkBestScore={quickThinkHighScore}
        />
      </Container>
    </>
  );
}