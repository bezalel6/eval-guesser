"use client";

import { createTheme } from "@mui/material/styles";

// Define the color palette based on the CSS variables in globals.css
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#81b64c", // accent color
    },
    background: {
      default: "#161512", // bg-primary
      paper: "#2e2a24", // bg-secondary
    },
    text: {
      primary: "#bababa",
      secondary: "#999999",
    },
  },
  typography: {
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(","),
    h1: {
      fontWeight: 300,
    },
    h2: {
      fontWeight: 300,
    },
    h3: {
      fontWeight: 400,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
        },
        containedPrimary: {
          color: "#161512", // bg-primary for text on accent buttons
          "&:hover": {
            backgroundColor: "#9bc767",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border: "1px solid #404040", // border-color
        },
      },
    },
  },
});

export default theme;