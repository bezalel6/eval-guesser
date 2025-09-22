
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
