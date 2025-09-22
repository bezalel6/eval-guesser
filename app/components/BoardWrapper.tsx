"use client";
import React, { useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Box, Typography, CircularProgress, IconButton } from "@mui/material";
import { Chess } from "chess.js";
import type { Key } from "chessground/types";
import { GameState, GameAction } from "../hooks/useGameReducer";

// MUI Icons
import LoopIcon from "@mui/icons-material/Loop";
import SwapVertIcon from "@mui/icons-material/SwapVert";

const ChessgroundBoard = dynamic(() => import("./ChessgroundBoard"), {
  ssr: false,
  loading: () => (
    <Box
      sx={{
        aspectRatio: "1 / 1",
        width: "100%",
        backgroundColor: "background.paper",
      }}
    />
  ),
});

interface BoardWrapperProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export default function BoardWrapper({ state, dispatch }: BoardWrapperProps) {
  const { currentFen, boardFlipped, phase } = state;
  const chessRef = useRef(new Chess());

  const handleMove = useCallback(
    (from: Key, to: Key) => {
      try {
        chessRef.current.load(currentFen);
        const move = chessRef.current.move({
          from: from as string,
          to: to as string,
          promotion: "q",
        });
        if (move) {
          dispatch({ type: "MOVE_PIECE", payload: chessRef.current.fen() });
        }
      } catch (e) {
        console.error("Invalid move:", e);
      }
    },
    [currentFen, dispatch]
  );

  const getLegalMoves = useCallback((fen: string): Map<Key, Key[]> => {
    const dests = new Map<Key, Key[]>();
    try {
      chessRef.current.load(fen);
      const moves = chessRef.current.moves({ verbose: true });
      moves.forEach((move) => {
        const from = move.from as Key;
        const to = move.to as Key;
        if (!dests.has(from)) dests.set(from, []);
        dests.get(from)!.push(to);
      });
    } catch (e) {
      console.log("Error calculating moves:", e);
    }
    return dests;
  }, []);

  const getTurnFromFen = useCallback((fen: string) => {
    try {
      chessRef.current.load(fen);
      return {
        turn: chessRef.current.turn() === "w" ? "White" : "Black",
        turnColor: chessRef.current.turn(),
        inCheck: chessRef.current.inCheck(),
      };
    } catch {
      return { turn: "White", turnColor: "w" as const, inCheck: false };
    }
  }, []);

  const { turn, turnColor, inCheck } = getTurnFromFen(currentFen);
  const boardOrientation = boardFlipped
    ? turnColor === "w"
      ? "black"
      : "white"
    : turnColor === "w"
    ? "white"
    : "black";
  const isBoardModified = currentFen !== state.puzzle.FEN;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        position: "relative",
      }}
    >
      <Box
        sx={{ width: "100%", position: "relative" }}
      >
        <ChessgroundBoard
          fen={currentFen}
          onMove={handleMove}
          orientation={boardOrientation}
          check={inCheck}
          viewOnly={phase === "result"}
          movable={{
            free: false,
            color: phase === "result" ? undefined : "both",
            dests:
              phase === "result" ? new Map() : getLegalMoves(currentFen),
          }}
        />
        {(phase === "loading" || phase === "solution-loading") && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.5)",
              borderRadius: "8px",
            }}
          >
            <CircularProgress color="primary" />
          </Box>
        )}
      </Box>
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: 1,
          mt: 1,
        }}
      >
        <Typography variant="body2" fontWeight="bold">
          {turn} to move
        </Typography>
        <Box>
          {isBoardModified && (
            <IconButton
              title="Reset Position"
              onClick={() => dispatch({ type: "RESET_POSITION" })}
            >
              <LoopIcon />
            </IconButton>
          )}
          <IconButton
            title="Flip Board"
            onClick={() => dispatch({ type: "FLIP_BOARD" })}
          >
            <SwapVertIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}
