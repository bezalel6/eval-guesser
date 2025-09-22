"use client";

import React, { useEffect } from "react";
import { Snackbar, Alert, Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { Achievement } from "../utils/scoring";

interface AchievementToastProps {
  achievements: Achievement[];
  onClose: () => void;
}

export default function AchievementToast({ achievements, onClose }: AchievementToastProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  
  const currentAchievement = achievements[currentIndex];
  
  useEffect(() => {
    if (currentAchievement && !open) {
      setOpen(true);
    }
  }, [currentAchievement, open]);
  
  const handleClose = () => {
    setOpen(false);
    // After closing, move to next achievement or clear
    setTimeout(() => {
      if (currentIndex < achievements.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onClose();
      }
    }, 500);
  };
  
  if (!currentAchievement) return null;
  
  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 0.6 }}
      >
        <Alert
          onClose={handleClose}
          severity="success"
          sx={{ 
            width: '100%',
            backgroundColor: 'primary.dark',
            color: 'white',
            '& .MuiAlert-icon': {
              fontSize: '2rem'
            }
          }}
          icon={<span style={{ fontSize: '2rem' }}>{currentAchievement.icon}</span>}
        >
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Achievement Unlocked!
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {currentAchievement.name}
            </Typography>
            <Typography variant="body2">
              {currentAchievement.description}
            </Typography>
          </Box>
        </Alert>
      </motion.div>
    </Snackbar>
  );
}