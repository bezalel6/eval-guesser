"use client";

import React from "react";
import { Box, Typography, Container } from "@mui/material";
import { motion } from "framer-motion";
import GameModeCard from "./GameModeCard";
import PsychologyIcon from "@mui/icons-material/Psychology";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import { useRouter } from 'next/navigation';

interface HomepageProps {
  onClassicPlay: () => void;
  onQuickThinkPlay: () => void;
  classicBestScore?: number;
  quickThinkBestScore?: number;
}

export default function Homepage({
  onClassicPlay,
  onQuickThinkPlay,
  classicBestScore = 0,
  quickThinkBestScore = 0
}: HomepageProps) {
  const router = useRouter();
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center"
        }}
      >
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: "3rem", md: "4.5rem" },
              fontWeight: 300,
              mb: 2,
              background: "linear-gradient(135deg, #81b64c 0%, #9bc767 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textFillColor: "transparent"
            }}
          >
            Eval Guesser
          </Typography>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Typography
            variant="h4"
            color="text.secondary"
            sx={{
              fontWeight: 300,
              mb: 6,
              maxWidth: 600,
              mx: "auto"
            }}
          >
            Master Chess Position Evaluation
          </Typography>
        </motion.div>

        {/* Game Mode Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Box
            sx={{
              display: "flex",
              gap: 4,
              flexDirection: { xs: "column", md: "row" },
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {/* Puzzle Streak Card (Lichess-style) */}
            <GameModeCard
              title="Puzzle Streak"
              description="Solve progressively harder puzzles. One wrong move ends the streak!"
              icon={<PsychologyIcon />}
              bestScore={classicBestScore}
              onPlay={onClassicPlay}
              hideScore={true}
            />

            {/* Quick Think Mode Card */}
            <GameModeCard
              title="Quick Think Mode"
              description="Who's better? Fast decisions, no room for error."
              icon={<FlashOnIcon />}
              bestScore={quickThinkBestScore}
              onPlay={onQuickThinkPlay}
              disabled={true} // Coming soon
            />
          </Box>
        </motion.div>

        {/* Analysis Board Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Box sx={{ mt: 4, maxWidth: 400, mx: "auto" }}>
            <GameModeCard
              title="Analysis Board"
              description="Analyze positions with Stockfish engine"
              icon={<QueryStatsIcon />}
              onPlay={() => router.push('/analysis')}
              hideScore={true}
            />
          </Box>
        </motion.div>

        {/* Subtitle with instructions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              mt: 6,
              maxWidth: 500,
              mx: "auto",
              lineHeight: 1.6
            }}
          >
            Choose your challenge and start training your chess evaluation skills.
            Track your progress and compete for the highest scores.
          </Typography>
        </motion.div>
      </Box>
    </Container>
  );
}