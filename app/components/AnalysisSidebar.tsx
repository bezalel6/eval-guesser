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
    Settings as SettingsIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Remove as RemoveIcon,
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
    const [showSettings, setShowSettings] = useState(false);

    // Format evaluation with color and icon
    const formatEvaluationWithColor = (evaluation: EngineEvaluation) => {
        let color: string;
        let icon: React.ReactNode;
        let text: string;

        if (evaluation.type === 'mate') {
            text = `M${Math.abs(evaluation.value)}`;
            color = evaluation.value > 0 ? '#4caf50' : '#f44336';
            icon = evaluation.value > 0 ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />;
        } else {
            const pawns = (evaluation.value / 100).toFixed(2);
            text = evaluation.value >= 0 ? `+${pawns}` : pawns;

            if (evaluation.value > 100) {
                color = '#4caf50';
                icon = <TrendingUpIcon fontSize="small" />;
            } else if (evaluation.value < -100) {
                color = '#f44336';
                icon = <TrendingDownIcon fontSize="small" />;
            } else {
                color = '#ffc107';
                icon = <RemoveIcon fontSize="small" />;
            }
        }

        return { text, color, icon };
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

    // Get move number for display
    const getMoveNumber = (index: number, isWhite: boolean): string => {
        const moveNum = Math.floor(index / 2) + 1;
        return isWhite ? `${moveNum}.` : `${moveNum}...`;
    };

    // Render a line of moves
    const renderMoveSequence = (moves: string[], lineIndex: number) => {
        const sanMoves = convertMovesToSan(moves, currentFen);

        return (
            <Box sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {sanMoves.slice(0, 8).map((move, index) => {
                        const isWhite = index % 2 === 0;
                        const moveNumber = getMoveNumber(index, isWhite);

                        return (
                            <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                                {isWhite && (
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: 'text.secondary',
                                            mr: 0.5,
                                            fontSize: '0.75rem'
                                        }}
                                    >
                                        {moveNumber}
                                    </Typography>
                                )}
                                <Chip
                                    label={move}
                                    size="small"
                                    variant={hoveredLine === lineIndex ? "filled" : "outlined"}
                                    clickable
                                    onClick={() => onMoveClick?.(moves[0])} // Play the first move
                                    sx={{
                                        fontSize: '0.75rem',
                                        height: 24,
                                        '& .MuiChip-label': {
                                            px: 1
                                        },
                                        backgroundColor: hoveredLine === lineIndex ? 'primary.main' : 'transparent',
                                        color: hoveredLine === lineIndex ? 'primary.contrastText' : 'text.primary',
                                    }}
                                />
                            </Box>
                        );
                    })}
                    {sanMoves.length > 8 && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
                            ...
                        </Typography>
                    )}
                </Box>
            </Box>
        );
    };

    const currentEvalFormatted = analysis.currentEvaluation
        ? formatEvaluationWithColor(analysis.currentEvaluation)
        : null;

    return (
        <Box sx={{ width: 350, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header with current evaluation */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6">Engine Analysis</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Settings">
                            <IconButton
                                size="small"
                                onClick={() => setShowSettings(!showSettings)}
                                color={showSettings ? 'primary' : 'default'}
                            >
                                <SettingsIcon />
                            </IconButton>
                        </Tooltip>
                        {isAnalyzing ? (
                            <Tooltip title="Stop analysis">
                                <IconButton size="small" onClick={onStop} color="error">
                                    <PauseIcon />
                                </IconButton>
                            </Tooltip>
                        ) : (
                            <Tooltip title="Clear cache">
                                <IconButton size="small" onClick={onClearCache}>
                                    <ClearIcon />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                </Box>

                {/* Current Evaluation Display */}
                {currentEvalFormatted ? (
                    <Card variant="outlined" sx={{ mb: 1 }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ color: currentEvalFormatted.color }}>
                                    {currentEvalFormatted.icon}
                                </Box>
                                <Typography
                                    variant="h5"
                                    sx={{
                                        fontWeight: 'bold',
                                        color: currentEvalFormatted.color
                                    }}
                                >
                                    {currentEvalFormatted.text}
                                </Typography>
                                <Box sx={{ flex: 1 }} />
                                <Chip
                                    label={`Depth ${analysis.depth}`}
                                    size="small"
                                    variant="outlined"
                                />
                            </Box>
                            {analysis.nodes > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                    {(analysis.nodes / 1000000).toFixed(1)}M nodes • {(analysis.nps / 1000).toFixed(0)}k nps
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
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

            {/* Engine Lines */}
            <Paper sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 2, pb: 1 }}>
                    <Typography variant="subtitle1" gutterBottom>
                        Engine Lines
                    </Typography>
                </Box>

                <Box sx={{ flex: 1, overflow: 'auto' }}>
                    {analysis.lines.length > 0 ? (
                        <List dense>
                            {analysis.lines.map((line, index) => {
                                const evalFormatted = formatEvaluationWithColor(line.score);

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
                                            sx={{
                                                flexDirection: 'column',
                                                alignItems: 'flex-start',
                                                py: 1,
                                                backgroundColor: hoveredLine === index ? 'action.hover' : 'transparent',
                                                '&:hover': {
                                                    backgroundColor: 'action.hover'
                                                }
                                            }}
                                        >
                                            {/* Line header with evaluation */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 0.5 }}>
                                                <Chip
                                                    label={line.multipv}
                                                    size="small"
                                                    sx={{
                                                        minWidth: 24,
                                                        height: 20,
                                                        fontSize: '0.7rem',
                                                        mr: 1
                                                    }}
                                                />
                                                <Box sx={{ display: 'flex', alignItems: 'center', color: evalFormatted.color }}>
                                                    {evalFormatted.icon}
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            fontWeight: 'bold',
                                                            ml: 0.5,
                                                            color: evalFormatted.color
                                                        }}
                                                    >
                                                        {evalFormatted.text}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ flex: 1 }} />
                                                <Typography variant="caption" color="text.secondary">
                                                    d{line.depth}
                                                </Typography>
                                            </Box>

                                            {/* Move sequence */}
                                            {renderMoveSequence(line.pv, index)}
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

            {/* Settings Panel */}
            {showSettings && (
                <Paper sx={{ mt: 2, p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Engine Statistics
                    </Typography>
                    {cacheStats && (
                        <>
                            <Typography variant="body2" color="text.secondary">
                                Cached positions: {cacheStats.size}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Best move: {analysis.bestMove || 'None'}
                            </Typography>
                        </>
                    )}
                </Paper>
            )}
        </Box>
    );
}
