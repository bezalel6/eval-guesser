'use client';

import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemButton,
    Chip,
    LinearProgress,
    IconButton,
    Tooltip,
    Card,
    CardContent,
} from '@mui/material';
import {
    Pause as PauseIcon,
    Clear as ClearIcon,
} from '@mui/icons-material';
import { Chess, Square } from 'chess.js';
import { AnalysisState, EngineLine, EngineEvaluation } from '../hooks/useStockfishAnalysis';

interface AnalysisSidebarProps {
    analysis: AnalysisState;
    currentFen: string;
    onMoveClick?: (move: string) => void;
    onLineHover?: (line: EngineLine | null) => void;
    onStop?: () => void;
    onClearCache?: () => void;
    isAnalyzing?: boolean;
    cacheStats?: { size: number; positions: string[] };
}

export default function AnalysisSidebar({
    analysis,
    currentFen,
    onMoveClick,
    onLineHover,
    onStop,
    onClearCache,
    isAnalyzing = false,
    cacheStats
}: AnalysisSidebarProps) {
    const [hoveredLine, setHoveredLine] = useState<number | null>(null);

    // Format evaluation with color
    const formatEvaluation = (evaluation: EngineEvaluation) => {
        let color: string;
        let text: string;

        if (evaluation.type === 'mate') {
            text = `M${Math.abs(evaluation.value)}`;
            color = evaluation.value > 0 ? '#4caf50' : '#f44336';
        } else {
            const pawns = (evaluation.value / 100).toFixed(2);
            text = evaluation.value >= 0 ? `+${pawns}` : pawns;

            if (evaluation.value > 100) {
                color = '#4caf50';
            } else if (evaluation.value < -100) {
                color = '#f44336';
            } else {
                color = '#ffc107';
            }
        }

        return { text, color };
    };

    // Convert moves to SAN notation for display
    const convertMovesToSan = (moves: string[], fen: string): string[] => {
        try {
            const chess = new Chess(fen);
            const sanMoves: string[] = [];

            for (const move of moves) {
                let moveObj;

                // Check if move is in UCI format (e.g., "e2e4", "e7e8q")
                if (move.length >= 4 && move.match(/^[a-h][1-8][a-h][1-8][qrbn]?$/)) {
                    // Convert UCI to move object
                    const from = move.substring(0, 2);
                    const to = move.substring(2, 4);
                    const promotion = move.length > 4 ? move[4] : undefined;

                    try {
                        moveObj = chess.move({
                            from: from as Square,
                            to: to as Square,
                            promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined
                        });
                    } catch (e) {
                        // If UCI format fails, try as SAN
                        try {
                            moveObj = chess.move(move);
                        } catch (e2) {
                            // Move is invalid
                        }
                    }
                } else {
                    // Assume SAN format
                    try {
                        moveObj = chess.move(move);
                    } catch (e) {
                        // Move is invalid
                    }
                }

                if (moveObj) {
                    sanMoves.push(moveObj.san);
                } else {
                    // If move is invalid, just use the original
                    sanMoves.push(move);
                }
            }

            return sanMoves;
        } catch (error) {
            console.error('Error converting moves to SAN:', error);
            return moves;
        }
    };


    // Get the first move from a line
    const getFirstMove = (moves: string[]): string => {
        if (!moves || moves.length === 0) return '';
        const sanMoves = convertMovesToSan(moves.slice(0, 1), currentFen);
        return sanMoves[0] || moves[0];
    };

    const currentEvalFormatted = analysis.currentEvaluation
        ? formatEvaluation(analysis.currentEvaluation)
        : null;

    return (
        <Box sx={{ width: 280, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header with current evaluation */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Analysis</Typography>
                    {isAnalyzing ? (
                        <Tooltip title="Stop">
                            <IconButton size="small" onClick={onStop}>
                                <PauseIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    ) : (
                        <Tooltip title="Clear">
                            <IconButton size="small" onClick={onClearCache}>
                                <ClearIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>

                {/* Current Evaluation Display - Compact */}
                {currentEvalFormatted ? (
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        py: 1,
                        borderBottom: '1px solid',
                        borderColor: 'divider'
                    }}>
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 'bold',
                                color: currentEvalFormatted.color
                            }}
                        >
                            {currentEvalFormatted.text}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            d{analysis.depth}
                        </Typography>
                        {analysis.nodes > 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                                {(analysis.nodes / 1000000).toFixed(1)}M
                            </Typography>
                        )}
                    </Box>
                ) : (
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                        {analysis.error ? (
                            <Typography color="error" variant="body2">
                                {analysis.error}
                            </Typography>
                        ) : !analysis.isReady ? (
                            <Typography color="text.secondary" variant="body2">
                                Initializing engine...
                            </Typography>
                        ) : (
                            <Typography color="text.secondary" variant="body2">
                                Make a move to start analysis
                            </Typography>
                        )}
                    </Box>
                )}

                {/* Analysis Progress */}
                {isAnalyzing && (
                    <LinearProgress
                        sx={{
                            mt: 1,
                            borderRadius: 1,
                            backgroundColor: 'rgba(255,255,255,0.1)'
                        }}
                    />
                )}
            </Paper>

            {/* Engine Lines - Compact */}
            <Paper sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
                    {analysis.lines.length > 0 ? (
                        <List dense sx={{ py: 0 }}>
                            {analysis.lines.map((line, index) => {
                                const evalFormatted = formatEvaluation(line.score);
                                const firstMove = getFirstMove(line.pv);

                                return (
                                    <ListItem
                                        key={line.multipv}
                                        disablePadding
                                        onMouseEnter={() => {
                                            setHoveredLine(index);
                                            onLineHover?.(line);
                                        }}
                                        onMouseLeave={() => {
                                            setHoveredLine(null);
                                            onLineHover?.(null);
                                        }}
                                    >
                                        <ListItemButton
                                            onClick={() => onMoveClick?.(line.pv[0])}
                                            sx={{
                                                py: 0.75,
                                                px: 1,
                                                backgroundColor: hoveredLine === index ? 'action.hover' : 'transparent',
                                                '&:hover': {
                                                    backgroundColor: 'action.hover'
                                                },
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 2
                                            }}
                                        >
                                            {/* Evaluation */}
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 'bold',
                                                    color: evalFormatted.color,
                                                    minWidth: '60px'
                                                }}
                                            >
                                                {evalFormatted.text}
                                            </Typography>

                                            {/* First move only */}
                                            <Chip
                                                label={firstMove}
                                                size="small"
                                                variant={hoveredLine === index ? "filled" : "outlined"}
                                                sx={{
                                                    height: 22,
                                                    fontSize: '0.8rem',
                                                    backgroundColor: hoveredLine === index ? 'primary.main' : 'transparent',
                                                    color: hoveredLine === index ? 'primary.contrastText' : 'text.primary',
                                                }}
                                            />

                                            {/* Depth indicator */}
                                            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                                                d{line.depth}
                                            </Typography>
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                        </List>
                    ) : (
                        <Box sx={{ p: 2, textAlign: 'center' }}>
                            <Typography color="text.secondary" variant="body2">
                                {isAnalyzing ? 'Analyzing position...' : 'No analysis available'}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Paper>

        </Box>
    );
}
