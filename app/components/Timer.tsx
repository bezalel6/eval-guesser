"use client";

import React, { useEffect, useState } from "react";
import { Box, Typography, LinearProgress } from "@mui/material";
import BoltIcon from '@mui/icons-material/Bolt';
import { motion } from "framer-motion";

interface TimerProps {
  startTime: number | null;
  phase: string;
}

export default function Timer({ startTime, phase }: TimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  
  useEffect(() => {
    if (!startTime || phase !== 'guessing') {
      setElapsedTime(0);
      return;
    }
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
    }, 100); // Update every 100ms for smooth animation
    
    return () => clearInterval(interval);
  }, [startTime, phase]);
  
  if (phase !== 'guessing' || elapsedTime >= 30) return null;
  
  // Calculate bonus level
  const getBonusInfo = () => {
    if (elapsedTime < 10) return { bonus: 300, color: 'info', label: 'Speed Bonus +300' };
    if (elapsedTime < 20) return { bonus: 200, color: 'warning', label: 'Speed Bonus +200' };
    if (elapsedTime < 30) return { bonus: 100, color: 'success', label: 'Speed Bonus +100' };
    return { bonus: 0, color: 'inherit', label: 'No Speed Bonus' };
  };
  
  const bonusInfo = getBonusInfo();
  const progressValue = (30 - elapsedTime) / 30 * 100;
  
  return (
    <Box sx={{ 
      position: 'fixed', 
      top: 20, 
      right: 20, 
      width: 200,
      p: 2,
      backgroundColor: 'background.paper',
      borderRadius: 2,
      boxShadow: 3,
      zIndex: 1000
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <BoltIcon color={bonusInfo.color as any} sx={{ mr: 1 }} />
        <Typography variant="body2" fontWeight="bold">
          {elapsedTime}s
        </Typography>
      </Box>
      
      <LinearProgress 
        variant="determinate" 
        value={progressValue}
        color={bonusInfo.color as any}
        sx={{ mb: 1, height: 8, borderRadius: 4 }}
      />
      
      <motion.div
        key={bonusInfo.label}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Typography variant="caption" color={`${bonusInfo.color}.main`} fontWeight="bold">
          {bonusInfo.label}
        </Typography>
      </motion.div>
    </Box>
  );
}