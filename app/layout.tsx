
import type { Metadata } from "next";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import EmotionCacheProvider from "./emotion";
import theme from "./theme";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Eval Rush",
  description: "Master chess position evaluation in a fast-paced puzzle rush",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <EmotionCacheProvider>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <main>{children}</main>
            </ThemeProvider>
          </EmotionCacheProvider>
        </Providers>
      </body>
    </html>
  );
}
