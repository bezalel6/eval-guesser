"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Container, Paper, TextField, Button, Typography, Box, Alert } from "@mui/material";
import EmailIcon from '@mui/icons-material/Email';
import Header from "@/app/components/Header";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("email", {
        email,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError("Failed to send sign-in email. Please try again.");
      } else {
        // Redirect to verification page
        window.location.href = `/auth/verify?email=${encodeURIComponent(email)}`;
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Sign In" />
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <EmailIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Sign in to Eval Rush
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter your email to receive a sign-in link
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              type="email"
              label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              sx={{ mb: 3 }}
            />
            
            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading || !email}
            >
              {loading ? "Sending..." : "Send Sign-in Link"}
            </Button>
          </form>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
            We'll send you a secure link to sign in - no password needed!
          </Typography>
        </Paper>
      </Container>
    </>
  );
}