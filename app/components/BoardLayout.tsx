"use client";

import React from "react";
import { Container, Box } from "@mui/material";

interface BoardLayoutProps {
  variant: "game" | "analysis";
  
  // Common props
  board: React.ReactNode;
  evalBar?: React.ReactNode;
  
  // Game variant props
  scorePanel?: React.ReactNode;
  slider?: React.ReactNode;
  controls?: React.ReactNode;
  
  // Analysis variant props
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
}

export default function BoardLayout({
  variant,
  board,
  evalBar,
  scorePanel,
  slider,
  controls,
  header,
  sidebar,
}: BoardLayoutProps) {
  if (variant === "analysis") {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: '#1a1a1a'
      }}>
        {header}
        <Box sx={{ 
          display: 'flex', 
          flex: 1,
          gap: 3,
          p: 2,
          maxWidth: '1600px',
          margin: '0 auto',
          width: '100%',
          alignItems: 'flex-start'
        }}>
          {/* Main content area - board with eval bar */}
          <Box sx={{ 
            flex: '1 1 auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            position: 'relative'
          }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexGrow: 1,
                overflow: "hidden",
                px: 2,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  maxWidth: "calc(100vh - 120px)",
                  width: "100%",
                }}
              >
                {board}
                {evalBar && (
                  <Box
                    sx={{
                      display: "flex",
                      alignSelf: "stretch",
                      ml: 1,
                      width: "300px",
                    }}
                  >
                    {evalBar}
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
          
          {/* Sidebar */}
          <Box sx={{ 
            width: '400px',
            minWidth: '350px',
            maxWidth: '450px',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0
          }}>
            {sidebar}
          </Box>
        </Box>
      </Box>
    );
  }

  // Game variant layout
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
          {/* Main game area */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexGrow: 1,
                overflow: "hidden",
                px: 2,
                width: "100%",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  maxWidth: "calc(100vh - 120px)",
                  width: "100%",
                }}
              >
                {board}
                {evalBar && (
                  <Box
                    sx={{
                      display: "flex",
                      alignSelf: "stretch",
                      ml: 1,
                      width: "300px",
                    }}
                  >
                    {evalBar}
                  </Box>
                )}
              </Box>
            </Box>
            {slider}
            {controls}
          </Box>
        </Box>
      </Box>
    </Container>
  );
}