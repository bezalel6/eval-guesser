"use client";

import { useSearchParams } from "next/navigation";
import { Container, Paper, Typography, Box } from "@mui/material";
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import Header from "@/app/components/Header";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <>
      <Header title="Check Your Email" />
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
          <MailOutlineIcon sx={{ fontSize: 64, color: 'success.main', mb: 3 }} />
          
          <Typography variant="h4" gutterBottom>
            Check your email
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            A sign-in link has been sent to:
          </Typography>
          
          {email && (
            <Typography variant="h6" sx={{ mb: 3 }}>
              {email}
            </Typography>
          )}
          
          <Box sx={{ mt: 4, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Click the link in the email to sign in. You can close this window.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </>
  );
}