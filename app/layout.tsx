
import type { Metadata } from "next";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import EmotionCacheProvider from "./emotion";
import theme from "./theme";
import "./globals.css";
import { StockfishProvider } from "./lib/stockfish-engine";

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
      <body>
        <EmotionCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <StockfishProvider>
              <main>{children}</main>
            </StockfishProvider>
          </ThemeProvider>
        </EmotionCacheProvider>
      </body>
    </html>
  );
}
