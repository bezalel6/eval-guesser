'use client';

import { Chess } from 'chess.js';
import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';

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
  san?: string[]; // Standard algebraic notation
}

export interface StockfishEngineAPI {
  analyze: (fen: string, depth?: number) => Promise<void>;
  getTopMoves: (fen: string, depth?: number, numLines?: number) => Promise<AnalysisLine[]>;
  stop: () => void;
  onInfo: (callback: (info: EngineInfo) => void) => () => void; // Returns cleanup function
  onBestMove: (callback: (move: string, ponder?: string) => void) => () => void; // Returns cleanup function
  setMultiPV: (lines: number) => void;
  isInitialized: () => boolean;
  getInitializationError: () => string | null;
}

type EngineStatus = 'initializing' | 'ready' | 'error' | 'destroyed';

class StockfishEngine {
  private worker: Worker | null = null;
  private status: EngineStatus = 'initializing';
  private initializationError: string | null = null;
  private onInfoCallbacks = new Map<(info: EngineInfo) => void, boolean>();
  private onBestMoveCallbacks = new Map<(move: string, ponder?: string) => void, boolean>();
  private currentPosition: string = 'startpos';
  private currentDepth: number = 20;
  private multiPV: number = 3;
  private analyzing = false;
  private initializationPromise: Promise<void> | null = null;
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 1000; // Start with 1 second

  constructor() {
    // Don't auto-initialize in constructor to prevent memory leaks
  }

  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initialize();
    return this.initializationPromise;
  }

  private async _initialize(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Stockfish engine can only be initialized in browser environment');
    }

    if (this.status === 'ready') {
      return;
    }

    if (this.status === 'destroyed') {
      throw new Error('Engine has been destroyed and cannot be reinitialized');
    }

    this.status = 'initializing';
    this.initializationError = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // Clean up any existing worker
        if (this.worker) {
          this.worker.terminate();
          this.worker = null;
        }

        // Load Stockfish.js as a web worker
        this.worker = new Worker('/stockfish.js');

        // Set up error handling
        this.worker.onerror = (error) => {
          console.error('Stockfish worker error:', error);
          this.initializationError = `Worker error: ${error.message}`;
          this.status = 'error';
        };

        this.worker.onmessage = (event) => {
          const message = event.data;
          this.handleEngineMessage(message);
        };

        // Initialize the engine with timeout
        this.send('uci');
        
        // Wait for the engine to be ready with timeout
        await this.waitForReady(10000); // 10 second timeout
        
        // Set options for better analysis
        this.send('setoption name MultiPV value ' + this.multiPV);
        this.send('setoption name Threads value 2');
        this.send('setoption name Hash value 256');
        
        this.status = 'ready';
        this.retryCount = 0;
        return;
        
      } catch (error) {
        console.error(`Stockfish initialization attempt ${attempt + 1} failed:`, error);
        this.initializationError = error instanceof Error ? error.message : 'Unknown initialization error';
        
        if (attempt < this.maxRetries) {
          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempt);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    this.status = 'error';
    throw new Error(`Failed to initialize Stockfish after ${this.maxRetries + 1} attempts: ${this.initializationError}`);
  }


  private handleEngineMessage(message: string) {
    try {
      // UCI ready
      if (message === 'uciok') {
        this.status = 'ready';
      }

      // Info during search
      if (message.startsWith('info')) {
        const info = this.parseInfo(message);
        if (info) {
          // Clean up any invalid callbacks before calling
          this.cleanupInvalidCallbacks();
          this.onInfoCallbacks.forEach((_, callback) => {
            try {
              callback(info);
            } catch (error) {
              console.error('Error in info callback:', error);
              // Mark callback for removal
              this.onInfoCallbacks.set(callback, false);
            }
          });
        }
      }

      // Best move found
      if (message.startsWith('bestmove')) {
        const parts = message.split(' ');
        const bestMove = parts[1];
        const ponderMove = parts[3];
        
        // Clean up any invalid callbacks before calling
        this.cleanupInvalidCallbacks();
        this.onBestMoveCallbacks.forEach((_, callback) => {
          try {
            callback(bestMove, ponderMove);
          } catch (error) {
            console.error('Error in bestmove callback:', error);
            // Mark callback for removal
            this.onBestMoveCallbacks.set(callback, false);
          }
        });
      }
    } catch (error) {
      console.error('Error handling engine message:', error);
    }
  }

  private cleanupInvalidCallbacks() {
    // Remove callbacks marked as invalid
    const invalidInfoCallbacks: Array<(info: EngineInfo) => void> = [];
    this.onInfoCallbacks.forEach((isValid, callback) => {
      if (!isValid) {
        invalidInfoCallbacks.push(callback);
      }
    });
    invalidInfoCallbacks.forEach(callback => {
      this.onInfoCallbacks.delete(callback);
    });
    
    const invalidBestMoveCallbacks: Array<(move: string, ponder?: string) => void> = [];
    this.onBestMoveCallbacks.forEach((isValid, callback) => {
      if (!isValid) {
        invalidBestMoveCallbacks.push(callback);
      }
    });
    invalidBestMoveCallbacks.forEach(callback => {
      this.onBestMoveCallbacks.delete(callback);
    });
  }

  private parseInfo(message: string): EngineInfo | null {
    const parts = message.split(' ');
    const info: Partial<EngineInfo> = {};
    
    let i = 0;
    while (i < parts.length) {
      switch (parts[i]) {
        case 'depth':
          info.depth = parseInt(parts[++i]);
          break;
        case 'seldepth':
          info.seldepth = parseInt(parts[++i]);
          break;
        case 'multipv':
          info.multipv = parseInt(parts[++i]);
          break;
        case 'score':
          i++;
          if (parts[i] === 'cp') {
            info.score = { unit: 'cp', value: parseInt(parts[++i]) };
          } else if (parts[i] === 'mate') {
            info.score = { unit: 'mate', value: parseInt(parts[++i]) };
          }
          break;
        case 'nodes':
          info.nodes = parseInt(parts[++i]);
          break;
        case 'nps':
          info.nps = parseInt(parts[++i]);
          break;
        case 'time':
          info.time = parseInt(parts[++i]);
          break;
        case 'pv': {
          const pvMoves: string[] = [];
          i++;
          while (i < parts.length && !['depth', 'seldepth', 'multipv', 'score', 'nodes', 'nps', 'time'].includes(parts[i])) {
            pvMoves.push(parts[i++]);
          }
          info.pv = pvMoves.join(' ');
          i--;
          break;
        }
      }
      i++;
    }

    if (info.depth && info.score && info.pv) {
      return info as EngineInfo;
    }
    return null;
  }

  private async waitForReady(timeoutMs: number = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkReady = () => {
        if (this.status === 'ready') {
          resolve();
        } else if (this.status === 'error') {
          reject(new Error(`Engine initialization failed: ${this.initializationError}`));
        } else if (Date.now() - startTime > timeoutMs) {
          reject(new Error(`Engine initialization timeout after ${timeoutMs}ms`));
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }

  async analyze(fen: string, depth: number = 20): Promise<void> {
    if (this.status === 'destroyed') {
      throw new Error('Engine has been destroyed');
    }

    if (this.status !== 'ready') {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error('Worker not available');
    }

    this.currentPosition = fen;
    this.currentDepth = depth;
    this.analyzing = true;

    // Stop any ongoing analysis
    this.send('stop');
    
    // Set position
    this.send(`position fen ${fen}`);
    
    // Start infinite analysis
    this.send('go infinite');
  }

  async getTopMoves(fen: string, depth: number = 20, numLines: number = 3): Promise<AnalysisLine[]> {
    if (this.status === 'destroyed') {
      throw new Error('Engine has been destroyed');
    }

    if (this.status !== 'ready') {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error('Worker not available');
    }

    // Set MultiPV for multiple lines
    if (numLines !== this.multiPV) {
      this.multiPV = numLines;
      this.send(`setoption name MultiPV value ${numLines}`);
    }

    const lines: Map<number, EngineInfo> = new Map();
    const analysisComplete = new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Analysis timeout'));
      }, 30000); // 30 second timeout

      const infoHandler = (info: EngineInfo) => {
        if (info.multipv) {
          lines.set(info.multipv, info);
        }
      };

      const bestMoveHandler = () => {
        cleanup();
        resolve();
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        infoCleanup();
        bestMoveCleanup();
      };

      const infoCleanup = this.onInfo(infoHandler);
      const bestMoveCleanup = this.onBestMove(bestMoveHandler);
    });

    try {
      // Set position and analyze
      this.send(`position fen ${fen}`);
      this.send(`go depth ${depth}`);

      await analysisComplete;

      // Convert to AnalysisLine format
      const result: AnalysisLine[] = [];

      for (let i = 1; i <= numLines; i++) {
        const info = lines.get(i);
        if (info) {
          const moves = info.pv.split(' ');
          const san: string[] = [];
          const tempChess = new Chess(fen);

          // Convert UCI moves to SAN
          for (const move of moves) {
            if (move.length >= 4) {
              try {
                const from = move.substring(0, 2);
                const to = move.substring(2, 4);
                const promotion = move.length > 4 ? move[4] : undefined;
                
                const chessMove = tempChess.move({
                  from,
                  to,
                  promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined
                });
                
                if (chessMove) {
                  san.push(chessMove.san);
                }
              } catch {
                break;
              }
            }
          }

          result.push({
            moves,
            evaluation: {
              type: info.score.unit,
              value: info.score.value
            },
            depth: info.depth,
            san
          });
        }
      }

      return result;
    } catch (error) {
      console.error('Error in getTopMoves:', error);
      throw error;
    }
  }

  stop() {
    if (this.worker && this.status === 'ready') {
      this.send('stop');
      this.analyzing = false;
    }
  }

  onInfo(callback: (info: EngineInfo) => void): () => void {
    this.onInfoCallbacks.set(callback, true);
    
    // Return cleanup function
    return () => {
      this.onInfoCallbacks.delete(callback);
    };
  }

  onBestMove(callback: (move: string, ponder?: string) => void): () => void {
    this.onBestMoveCallbacks.set(callback, true);
    
    // Return cleanup function
    return () => {
      this.onBestMoveCallbacks.delete(callback);
    };
  }

  setMultiPV(lines: number) {
    this.multiPV = lines;
    if (this.worker && this.status === 'ready') {
      this.send(`setoption name MultiPV value ${lines}`);
    }
  }

  isInitialized(): boolean {
    return this.status === 'ready';
  }

  getInitializationError(): string | null {
    return this.initializationError;
  }

  destroy() {
    this.stop();
    
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    this.onInfoCallbacks.clear();
    this.onBestMoveCallbacks.clear();
    this.status = 'destroyed';
    this.initializationPromise = null;
  }

  private send(command: string) {
    if (this.worker && this.status !== 'destroyed') {
      try {
        this.worker.postMessage(command);
      } catch (error) {
        console.error('Error sending command to worker:', error);
        this.initializationError = 'Worker communication error';
        this.status = 'error';
      }
    }
  }
}

// React Context for managing Stockfish engine lifecycle
interface StockfishContextValue {
  engine: StockfishEngineAPI | null;
  isInitialized: boolean;
  initializationError: string | null;
  isInitializing: boolean;
}

const StockfishContext = createContext<StockfishContextValue>({
  engine: null,
  isInitialized: false,
  initializationError: null,
  isInitializing: false
});

interface StockfishProviderProps {
  children: ReactNode;
}

export function StockfishProvider({ children }: StockfishProviderProps) {
  const engineRef = useRef<StockfishEngine | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Handle SSR by only initializing after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize engine only after mount to prevent SSR issues
  useEffect(() => {
    // Skip initialization on server or before mount
    if (!isMounted || typeof window === 'undefined') {
      return;
    }

    const initEngine = async () => {
      setIsInitializing(true);
      setInitializationError(null);

      try {
        const engine = new StockfishEngine();
        await engine.initialize();
        engineRef.current = engine;
        setIsInitialized(true);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
        setInitializationError(errorMessage);
        console.error('Failed to initialize Stockfish:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initEngine();

    // Cleanup on unmount
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [isMounted]);

  // Create stable API object
  const engineAPI: StockfishEngineAPI | null = engineRef.current ? {
    analyze: (fen: string, depth?: number) => engineRef.current!.analyze(fen, depth),
    getTopMoves: (fen: string, depth?: number, numLines?: number) => 
      engineRef.current!.getTopMoves(fen, depth, numLines),
    stop: () => engineRef.current!.stop(),
    onInfo: (callback: (info: EngineInfo) => void) => engineRef.current!.onInfo(callback),
    onBestMove: (callback: (move: string, ponder?: string) => void) => 
      engineRef.current!.onBestMove(callback),
    setMultiPV: (lines: number) => engineRef.current!.setMultiPV(lines),
    isInitialized: () => engineRef.current!.isInitialized(),
    getInitializationError: () => engineRef.current!.getInitializationError()
  } : null;

  const value: StockfishContextValue = {
    engine: engineAPI,
    isInitialized,
    initializationError,
    isInitializing
  };

  return (
    <StockfishContext.Provider value={value}>
      {children}
    </StockfishContext.Provider>
  );
}

export function useStockfish(): StockfishContextValue {
  const context = useContext(StockfishContext);
  if (!context) {
    throw new Error('useStockfish must be used within a StockfishProvider');
  }
  return context;
}

// Legacy export for backward compatibility - DO NOT USE in new code
// This will be removed in a future version
// @deprecated Use useStockfish hook instead
export const stockfishEngine = {
  analyze: () => { throw new Error('Use useStockfish hook instead of global stockfishEngine'); },
  getTopMoves: () => { throw new Error('Use useStockfish hook instead of global stockfishEngine'); },
  stop: () => { throw new Error('Use useStockfish hook instead of global stockfishEngine'); },
  onInfo: () => { throw new Error('Use useStockfish hook instead of global stockfishEngine'); },
  onBestMove: () => { throw new Error('Use useStockfish hook instead of global stockfishEngine'); },
  setMultiPV: () => { throw new Error('Use useStockfish hook instead of global stockfishEngine'); },
  destroy: () => { throw new Error('Use useStockfish hook instead of global stockfishEngine'); }
};