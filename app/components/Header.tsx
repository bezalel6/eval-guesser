"use client";

import React from "react";
import { AppBar, Toolbar, Typography, IconButton, Box } from "@mui/material";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SoundSettings from './SoundSettings';

interface HeaderProps {
  onBackClick?: () => void;
  showBackButton?: boolean;
  title?: string;
}

export default function Header({ onBackClick, showBackButton = false, title = "Eval Guesser" }: HeaderProps = {}) {
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: "background.default",
        borderBottom: "1px solid #404040",
      }}
    >
      <Toolbar>
        {showBackButton && (
          <IconButton
            edge="start"
            color="inherit"
            onClick={onBackClick}
            sx={{ mr: 2 }}
            title="Back to Menu (Esc)"
          >
            <ArrowBackIcon />
          </IconButton>
        )}
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <SoundSettings />
        </Box>
      </Toolbar>
    </AppBar>
  );
}