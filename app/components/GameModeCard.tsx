"use client";

import React from "react";
import { Paper, Typography, Button, Box, Chip } from "@mui/material";
import { motion } from "framer-motion";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";

interface GameModeCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  bestScore?: number;
  onPlay: () => void;
  disabled?: boolean;
  hideScore?: boolean;
}

export default function GameModeCard({
  title,
  description,
  icon,
  bestScore = 0,
  onPlay,
  disabled = false,
  hideScore = false
}: GameModeCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 3,
          borderRadius: 2,
          height: 200,
          width: 300,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          transition: "all 0.3s ease",
          "&:hover": {
            boxShadow: disabled ? undefined : "0 12px 32px rgba(0, 0, 0, 0.4)",
          },
        }}
        onClick={disabled ? undefined : onPlay}
      >
        {/* Header with icon and title */}
        <Box>
          <Box 
            sx={{ 
              display: "flex", 
              alignItems: "center", 
              mb: 2,
              "& .MuiSvgIcon-root": {
                fontSize: 32,
                color: "primary.main",
                mr: 1
              }
            }}
          >
            {icon}
            <Typography variant="h5" fontWeight="bold">
              {title}
            </Typography>
          </Box>
          
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              lineHeight: 1.5,
              mb: 2 
            }}
          >
            {description}
          </Typography>
        </Box>

        {/* Footer with score and play button */}
        <Box>
          {/* Best score chip */}
          {!hideScore && (
            <Box sx={{ mb: 2 }}>
              <Chip
                icon={<EmojiEventsIcon sx={{ fontSize: 16 }} />}
                label={`Best: ${bestScore.toLocaleString()}`}
                size="small"
                variant="outlined"
                sx={{
                  borderColor: "primary.main",
                  color: "primary.main",
                  fontWeight: "bold"
                }}
              />
            </Box>
          )}

          {/* Play button */}
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayArrowIcon />}
            fullWidth
            disabled={disabled}
            sx={{
              py: 1.5,
              fontWeight: "bold",
              fontSize: "1rem"
            }}
          >
            {disabled ? "Coming Soon" : "Play"}
          </Button>
        </Box>
      </Paper>
    </motion.div>
  );
}