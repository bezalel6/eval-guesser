
import type { Metadata } from "next";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eval Guesser",
  description: "Guess the chess position evaluation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <body>
          <main>{children}</main>
        </body>
      </ThemeProvider>
    </html>
  );
}
