'use client';

import React from 'react';
import { Box } from '@mui/material';

interface AnalysisLayoutProps {
  header: React.ReactNode;
  board: React.ReactNode;
  evalBar?: React.ReactNode;
  sidebar: React.ReactNode;
}

export default function AnalysisLayout({ header, board, evalBar, sidebar }: AnalysisLayoutProps) {
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
        gap: 2,
        p: 2,
        maxWidth: '1400px',
        margin: '0 auto',
        width: '100%'
      }}>
        <Box sx={{ 
          flex: '1 1 auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2
        }}>
          {board}
          {evalBar && (
            <Box sx={{ 
              display: 'flex',
              alignItems: 'center',
              height: '600px',
              '@media (max-width: 768px)': {
                height: '400px'
              },
              '@media (max-width: 500px)': {
                height: '350px'
              }
            }}>
              {evalBar}
            </Box>
          )}
        </Box>
        <Box sx={{ 
          width: '400px',
          minWidth: '350px',
          maxWidth: '450px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {sidebar}
        </Box>
      </Box>
    </Box>
  );
}
