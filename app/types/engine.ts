/**
 * TypeScript interfaces for chess engine operations and streaming analysis
 */

export interface EngineInfo {
  depth: number;
  seldepth?: number;
  multipv?: number;
  score: {
    unit: 'cp' | 'mate';
    value: number;
  };
  nodes?: number;
  nps?: number;
  time?: number;
  pv: string;
  bestMove?: string;
}

export interface AnalysisLine {
  moves: string[];
  evaluation: {
    type: 'cp' | 'mate';
    value: number;
  };
  depth: number;
  san?: string[];
}

export interface AnalysisRequest {
  fen: string;
  depth?: number;
  multiPV?: number;
  sessionId?: string;
}

export interface AnalysisResponse {
  sessionId: string;
  status: 'analyzing' | 'completed' | 'error' | 'stopped';
  depth: number;
  evaluation: {
    type: 'cp' | 'mate';
    value: number;
  } | null;
  lines: AnalysisLine[];
  error?: string;
}

export interface EngineStatus {
  sessionId: string;
  isAnalyzing: boolean;
  currentDepth: number;
  currentFen: string;
  startedAt: number;
  error?: string;
}

export interface EngineSession {
  id: string;
  fen: string;
  depth: number;
  multiPV: number;
  startedAt: number;
  isActive: boolean;
  lines: Map<number, EngineInfo>;
  bestEvaluation: {
    type: 'cp' | 'mate';
    value: number;
  } | null;
}

export interface SSEMessage {
  type: 'analysis-update' | 'analysis-complete' | 'analysis-error' | 'analysis-stopped';
  sessionId: string;
  data: AnalysisResponse;
}

export type EngineEventType = 'info' | 'bestmove' | 'error' | 'ready';

export interface EngineEvent {
  type: EngineEventType;
  sessionId: string;
  data: unknown;
}