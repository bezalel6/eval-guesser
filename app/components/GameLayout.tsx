"use client";

import React from "react";
import { Container, Box } from "@mui/material";

interface GameLayoutProps {
  scorePanel: React.ReactNode;
  board: React.ReactNode;
  slider: React.ReactNode;
  controls: React.ReactNode;
}

export default function GameLayout({
  scorePanel,
  board,
  slider,
  controls,
}: GameLayoutProps) {
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 4,
        }}
      >
        <Box
          sx={{
            width: { xs: "100%", md: "33.33%", lg: "25%" },
            flexShrink: 0,
          }}
        >
          {scorePanel}
        </Box>
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {board}
          {slider}
          {controls}
        </Box>
      </Box>
    </Container>
  );
}
