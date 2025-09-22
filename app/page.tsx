"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { 
  Container, 
  Paper, 
  Typography, 
  Button, 
  Box
} from "@mui/material";
import LoginIcon from '@mui/icons-material/Login';
import Header from "@/app/components/Header";

export default function Page() {
  const router = useRouter();

  return (
    <>
      <Header title="Eval Rush" />
      <Container maxWidth="md" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 6, textAlign: 'center' }}>
          <Typography 
            variant="h2" 
            gutterBottom
            sx={{
              background: "linear-gradient(135deg, #81b64c 0%, #9bc767 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: 300,
              mb: 3
            }}
          >
            Eval Rush
          </Typography>
          
          <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
            Master Chess Position Evaluation
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 6, maxWidth: 500, mx: 'auto' }}>
            Test your chess evaluation skills in a fast-paced puzzle rush format. 
            Guess the computer evaluation of positions and see how many you can solve!
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<LoginIcon />}
              onClick={() => router.push("/auth/signin")}
              sx={{ minWidth: 200 }}
              disabled
            >
              Sign In (Setup Required)
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              onClick={() => router.push("/analysis")}
              sx={{ minWidth: 200 }}
            >
              Try Analysis Board
            </Button>
          </Box>
          
          <Box sx={{ mt: 4, p: 2, bgcolor: 'warning.dark', borderRadius: 1 }}>
            <Typography variant="body2" color="warning.contrastText">
              Note: Authentication requires database setup. Configure PostgreSQL and email settings in .env.local
            </Typography>
          </Box>
          
          <Box sx={{ mt: 6, pt: 4, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom>
              Game Modes (Coming Soon)
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 4, justifyContent: 'center', mt: 3 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  5-Minute Rush
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Solve as many puzzles as you can in 5 minutes
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  Survival Mode
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No time limit - one mistake ends your run
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Container>
    </>
  );
}