"use client";

import React from "react";
import { Container, Box } from "@mui/material";

interface GameLayoutProps {
  scorePanel: React.ReactNode;
  board: React.ReactNode;
  evalBar?: React.ReactNode;
  slider?: React.ReactNode;
  controls: React.ReactNode;
}

export default function GameLayout({
  scorePanel,
  board,
  evalBar,
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
            gap: 2,
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {board}
            {slider}
            {controls}
          </Box>
          {evalBar && (
            <Box
              sx={{
                display: "block",
                height: {
                  xs: "350px",
                  sm: "400px",
                  md: "400px",
                  lg: "600px",
                }
              }}
            >
              {evalBar}
            </Box>
          )}
        </Box>
      </Box>
    </Container>
  );
}
