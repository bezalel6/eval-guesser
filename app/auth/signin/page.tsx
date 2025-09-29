"use client";

import React, { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { 
  Container, 
  Paper, 
  Typography, 
  Button,
  Box,
  Alert,
  CircularProgress
} from "@mui/material";
import Header from "@/app/components/Header";

function SignInContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const handleLichessSignIn = () => {
    signIn("lichess", { callbackUrl });
  };

  return (
    <>
      <Header title="Sign In" />
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            Sign in to Eval Rush
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error === "OAuthSignin" && "Error starting authentication"}
              {error === "OAuthCallback" && "Error during authentication"}
              {error === "Default" && "Unable to sign in"}
            </Alert>
          )}

          <Box sx={{ mt: 4 }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleLichessSignIn}
              sx={{
                backgroundColor: '#629924',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#4a7a1c',
                },
                py: 1.5,
                px: 4,
                fontSize: '1.1rem',
                textTransform: 'none',
              }}
              fullWidth
            >
              <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                ♘ Sign in with Lichess
              </Box>
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            We'll use your Lichess account to track your progress
          </Typography>
        </Paper>
      </Container>
    </>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <CircularProgress />
      </Box>
    }>
      <SignInContent />
    </Suspense>
  );
}