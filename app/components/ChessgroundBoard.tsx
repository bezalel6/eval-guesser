"use client";

import { useEffect, useRef, useCallback } from "react";
import { Chessground } from "chessground";
import { Api } from "chessground/api";
import { Config } from "chessground/config";
import type { Key } from "chessground/types";
import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.brown.css";
import "chessground/assets/chessground.cburnett.css";

interface ChessgroundBoardProps {
  fen: string;
  onMove?: (from: Key, to: Key) => void;
  allowDragging?: boolean;
  viewOnly?: boolean;
  orientation?: "white" | "black";
  premovable?: {
    enabled: boolean;
    showDests?: boolean;
    castle?: boolean;
    events?: {
      set?: (orig: Key, dest: Key) => void;
      unset?: () => void;
    };
  };
  movable?: {
    free?: boolean;
    color?: "white" | "black" | "both" | undefined;
    dests?: Map<Key, Key[]>;
  };
  check?: boolean | "white" | "black";
}

export default function ChessgroundBoard({
  fen,
  onMove,
  allowDragging = true,
  viewOnly = false,
  orientation = "white",
  premovable = { enabled: true },
  movable = { free: false, color: "both" },
  check = false,
}: ChessgroundBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);

  // Initialize the board
  useEffect(() => {
    if (!boardRef.current) return;

    const config: Config = {
      fen,
      orientation,
      viewOnly,
      disableContextMenu: true,
      coordinates: true,
      addPieceZIndex: false,
      check: check,
      movable: {
        free: movable.free || false,
        color: viewOnly ? undefined : movable.color || "both",
        showDests: true,
        dests: movable.dests,
        events: {
          after: onMove,
        },
      },
      premovable,
      draggable: {
        enabled: allowDragging && !viewOnly,
        distance: 3,
        autoDistance: false,
        showGhost: true,
        deleteOnDropOff: false,
      },
      selectable: {
        enabled: true,
      },
      events: {
        move: onMove,
      },
      animation: {
        enabled: true,
        duration: 50,
      },
    };

    apiRef.current = Chessground(boardRef.current, config);

    return () => {
      apiRef.current?.destroy();
    };
  }, []); // Only initialize once

  // Update FEN and check status when they change
  useEffect(() => {
    if (apiRef.current && fen) {
      apiRef.current.set({ fen, check: check });
    }
  }, [fen, check]);

  // Update movable settings
  useEffect(() => {
    if (apiRef.current) {
      apiRef.current.set({
        viewOnly,
        movable: {
          free: movable.free || false,
          color: viewOnly ? undefined : movable.color || "both",
          showDests: true,
          dests: movable.dests,
          events: {
            after: onMove,
          },
        },
        draggable: {
          enabled: allowDragging && !viewOnly,
        },
      });
    }
  }, [viewOnly, allowDragging, movable, onMove]);

  // Update orientation
  useEffect(() => {
    if (apiRef.current) {
      apiRef.current.set({ orientation });
    }
  }, [orientation]);

  // Method to programmatically make a move
  const makeMove = useCallback((from: Key, to: Key) => {
    if (apiRef.current) {
      apiRef.current.move(from, to);
    }
  }, []);

  // Method to get current FEN
  const getFen = useCallback(() => {
    return apiRef.current?.getFen();
  }, []);

  // Expose methods via ref if needed
  useEffect(() => {
    if (boardRef.current) {
      (boardRef.current as any).makeMove = makeMove;
      (boardRef.current as any).getFen = getFen;
      (boardRef.current as any).api = apiRef.current;
    }
  }, [makeMove, getFen]);

  return (
    <div
      ref={boardRef}
      style={{
        width: "100%",
        height: "100%",
        maxWidth: "600px",
        maxHeight: "600px",
        aspectRatio: "1 / 1",
        margin: "0 auto",
      }}
    />
  );
}
