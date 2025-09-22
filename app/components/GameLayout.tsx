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
            justifyContent: "center",
            alignItems: "flex-start",
          }}
        >
          {/* Main game area - board and eval bar together */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 3,
            }}
          >
            {/* Board and controls */}
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
            
            {/* Eval bar - part of the layout */}
            {evalBar && (
              <Box
                sx={{
                  display: "flex",
                  alignSelf: "stretch",
                  minHeight: {
                    xs: "350px",
                    sm: "400px",
                    md: "450px",
                    lg: "500px",
                  },
                }}
              >
                {evalBar}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
