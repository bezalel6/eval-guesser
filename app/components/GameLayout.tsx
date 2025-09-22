"use client";

import React from "react";
import { Container, Box } from "@mui/material";
import Grid from "@mui/material/Grid";

interface GameLayoutProps {
  scorePanel: React.ReactNode;
  board: React.ReactNode;
  slider: React.ReactNode;
  controls: React.ReactNode;
}

export default function GameLayout({ scorePanel, board, slider, controls }: GameLayoutProps) {
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          {scorePanel}
        </Grid>
        <Grid size={{ xs: 12, md: 8, lg: 9 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {board}
            {slider}
            {controls}
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}