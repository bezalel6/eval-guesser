'use client';

import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Slider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    FormControlLabel,
    Button,
    Divider,
    Tooltip,
    IconButton,
    Chip,
} from '@mui/material';
import {
    Info as InfoIcon,
    RestoreOutlined as RestoreIcon,
    Speed as SpeedIcon,
    Memory as MemoryIcon,
    Timeline as TimelineIcon,
} from '@mui/icons-material';
import { AnalysisOptions } from '../hooks/useStockfishAnalysis';

interface EngineSettingsProps {
    options: AnalysisOptions;
    onChange: (options: AnalysisOptions) => void;
    onReset: () => void;
    engineStats?: {
        isReady: boolean;
        isAnalyzing: boolean;
        cacheSize: number;
        depth: number;
        nodes: number;
        nps: number;
    };
}

const DEFAULT_OPTIONS: AnalysisOptions = {
    depth: 18,
    moveTime: 1000,
    multiPV: 5,
    hashSize: 128,
    threads: 1,
    infinite: false,
    autoAnalyze: true,
    debounceMs: 500,
    enableCaching: true
};

export default function EngineSettings({
    options,
    onChange,
    onReset,
    engineStats
}: EngineSettingsProps) {
    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleOptionChange = <K extends keyof AnalysisOptions>(
        key: K,
        value: AnalysisOptions[K]
    ) => {
        onChange({ ...options, [key]: value });
    };

    const getPerformanceLevel = () => {
        const depth = options.depth || DEFAULT_OPTIONS.depth!;
        const multiPV = options.multiPV || DEFAULT_OPTIONS.multiPV!;
        const hashSize = options.hashSize || DEFAULT_OPTIONS.hashSize!;

        const score = (depth / 20) + (multiPV / 10) + (hashSize / 256);

        if (score < 1.5) return { level: 'Light', color: '#4caf50' };
        if (score < 2.5) return { level: 'Balanced', color: '#ff9800' };
        return { level: 'Maximum', color: '#f44336' };
    };

    const performance = getPerformanceLevel();

    return (
        <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Engine Settings</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                        label={`Performance: ${performance.level}`}
                        size="small"
                        sx={{
                            backgroundColor: performance.color,
                            color: 'white',
                            fontWeight: 'bold'
                        }}
                    />
                    <Tooltip title="Reset to defaults">
                        <IconButton size="small" onClick={onReset}>
                            <RestoreIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Engine Status */}
            {engineStats && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Engine Status
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Chip
                            icon={<SpeedIcon />}
                            label={engineStats.isReady ? 'Ready' : 'Loading'}
                            color={engineStats.isReady ? 'success' : 'default'}
                            size="small"
                        />
                        {engineStats.isAnalyzing && (
                            <Chip
                                icon={<TimelineIcon />}
                                label="Analyzing"
                                color="primary"
                                size="small"
                            />
                        )}
                        <Chip
                            icon={<MemoryIcon />}
                            label={`Cache: ${engineStats.cacheSize}`}
                            size="small"
                        />
                        {engineStats.nps > 0 && (
                            <Chip
                                label={`${(engineStats.nps / 1000).toFixed(0)}k nps`}
                                size="small"
                            />
                        )}
                    </Box>
                </Box>
            )}

            {/* Basic Settings */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                    Analysis Settings
                </Typography>

                {/* Auto-analyze toggle */}
                <FormControlLabel
                    control={
                        <Switch
                            checked={options.autoAnalyze !== false}
                            onChange={(e) => handleOptionChange('autoAnalyze', e.target.checked)}
                        />
                    }
                    label="Auto-analyze positions"
                    sx={{ mb: 2 }}
                />

                {/* Depth setting */}
                <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2">
                            Analysis Depth: {options.depth || DEFAULT_OPTIONS.depth}
                        </Typography>
                        <Tooltip title="Higher depth = more accurate but slower analysis">
                            <InfoIcon fontSize="small" color="action" />
                        </Tooltip>
                    </Box>
                    <Slider
                        value={options.depth || DEFAULT_OPTIONS.depth!}
                        onChange={(_, value) => handleOptionChange('depth', value as number)}
                        min={8}
                        max={25}
                        step={1}
                        marks={[
                            { value: 8, label: 'Fast' },
                            { value: 15, label: 'Balanced' },
                            { value: 22, label: 'Deep' }
                        ]}
                        valueLabelDisplay="auto"
                    />
                </Box>

                {/* Multi-PV setting */}
                <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2">
                            Engine Lines: {options.multiPV || DEFAULT_OPTIONS.multiPV}
                        </Typography>
                        <Tooltip title="Number of best moves to show">
                            <InfoIcon fontSize="small" color="action" />
                        </Tooltip>
                    </Box>
                    <Slider
                        value={options.multiPV || DEFAULT_OPTIONS.multiPV!}
                        onChange={(_, value) => handleOptionChange('multiPV', value as number)}
                        min={1}
                        max={10}
                        step={1}
                        marks={[
                            { value: 1, label: '1' },
                            { value: 3, label: '3' },
                            { value: 5, label: '5' },
                            { value: 10, label: '10' }
                        ]}
                        valueLabelDisplay="auto"
                    />
                </Box>

                {/* Debounce setting */}
                <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2">
                            Analysis Delay: {options.debounceMs || DEFAULT_OPTIONS.debounceMs}ms
                        </Typography>
                        <Tooltip title="Delay before starting analysis after position change">
                            <InfoIcon fontSize="small" color="action" />
                        </Tooltip>
                    </Box>
                    <Slider
                        value={options.debounceMs || DEFAULT_OPTIONS.debounceMs!}
                        onChange={(_, value) => handleOptionChange('debounceMs', value as number)}
                        min={0}
                        max={2000}
                        step={100}
                        marks={[
                            { value: 0, label: 'None' },
                            { value: 500, label: '0.5s' },
                            { value: 1000, label: '1s' },
                            { value: 2000, label: '2s' }
                        ]}
                        valueLabelDisplay="auto"
                    />
                </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Advanced Settings Toggle */}
            <Button
                variant="text"
                onClick={() => setShowAdvanced(!showAdvanced)}
                sx={{ mb: showAdvanced ? 2 : 0 }}
            >
                {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
            </Button>

            {/* Advanced Settings */}
            {showAdvanced && (
                <Box>
                    <Typography variant="subtitle2" gutterBottom>
                        Advanced Settings
                    </Typography>

                    {/* Hash Size */}
                    <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="body2">
                                Hash Size: {options.hashSize || DEFAULT_OPTIONS.hashSize}MB
                            </Typography>
                            <Tooltip title="Memory allocated for engine hash table">
                                <InfoIcon fontSize="small" color="action" />
                            </Tooltip>
                        </Box>
                        <Slider
                            value={options.hashSize || DEFAULT_OPTIONS.hashSize!}
                            onChange={(_, value) => handleOptionChange('hashSize', value as number)}
                            min={16}
                            max={512}
                            step={16}
                            marks={[
                                { value: 16, label: '16MB' },
                                { value: 128, label: '128MB' },
                                { value: 256, label: '256MB' },
                                { value: 512, label: '512MB' }
                            ]}
                            valueLabelDisplay="auto"
                        />
                    </Box>

                    {/* Move Time */}
                    <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="body2">
                                Max Think Time: {options.moveTime || DEFAULT_OPTIONS.moveTime}ms
                            </Typography>
                            <Tooltip title="Maximum time engine can spend analyzing">
                                <InfoIcon fontSize="small" color="action" />
                            </Tooltip>
                        </Box>
                        <Slider
                            value={options.moveTime || DEFAULT_OPTIONS.moveTime!}
                            onChange={(_, value) => handleOptionChange('moveTime', value as number)}
                            min={100}
                            max={10000}
                            step={100}
                            marks={[
                                { value: 100, label: '0.1s' },
                                { value: 1000, label: '1s' },
                                { value: 5000, label: '5s' },
                                { value: 10000, label: '10s' }
                            ]}
                            valueLabelDisplay="auto"
                        />
                    </Box>

                    {/* Thread count */}
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Threads</InputLabel>
                        <Select
                            value={options.threads || DEFAULT_OPTIONS.threads!}
                            onChange={(e) => handleOptionChange('threads', e.target.value as number)}
                            label="Threads"
                        >
                            <MenuItem value={1}>1 Thread (Recommended)</MenuItem>
                            <MenuItem value={2}>2 Threads</MenuItem>
                            <MenuItem value={4}>4 Threads</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Advanced toggles */}
                    <FormControlLabel
                        control={
                            <Switch
                                checked={options.infinite || false}
                                onChange={(e) => handleOptionChange('infinite', e.target.checked)}
                            />
                        }
                        label="Infinite analysis"
                        sx={{ mb: 1 }}
                    />

                    <FormControlLabel
                        control={
                            <Switch
                                checked={options.enableCaching !== false}
                                onChange={(e) => handleOptionChange('enableCaching', e.target.checked)}
                            />
                        }
                        label="Enable position caching"
                    />
                </Box>
            )}
        </Paper>
    );
}
