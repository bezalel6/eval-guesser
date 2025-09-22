'use client';

import { Chess } from 'chess.js';

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

class StockfishEngine {
  private worker: Worker | null = null;
  private isReady = false;
  private onInfoCallbacks: Set<(info: EngineInfo) => void> = new Set();
  private onBestMoveCallbacks: Set<(move: string, ponder?: string) => void> = new Set();
  private currentPosition: string = 'startpos';
  private currentDepth: number = 20;
  private multiPV: number = 3;
  private analyzing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private async initialize() {
    try {
      // Load Stockfish.js as a web worker - use the WASM version for browser
      // Create worker from CDN URL to avoid bundling issues
      this.worker = new Worker('/stockfish.js');

      this.worker.onmessage = (event) => {
        const message = event.data;
        this.handleEngineMessage(message);
      };

      // Initialize the engine
      this.send('uci');
      
      // Wait for the engine to be ready
      await this.waitForReady();
      
      // Set options for better analysis
      this.send('setoption name MultiPV value ' + this.multiPV);
      this.send('setoption name Threads value 2');
      this.send('setoption name Hash value 256');
      
    } catch (error) {
      console.error('Failed to initialize Stockfish:', error);
    }
  }

  private send(command: string) {
    if (this.worker) {
      this.worker.postMessage(command);
    }
  }

  private handleEngineMessage(message: string) {
    // UCI ready
    if (message === 'uciok') {
      this.isReady = true;
    }

    // Info during search
    if (message.startsWith('info')) {
      const info = this.parseInfo(message);
      if (info) {
        this.onInfoCallbacks.forEach(callback => callback(info));
      }
    }

    // Best move found
    if (message.startsWith('bestmove')) {
      const parts = message.split(' ');
      const bestMove = parts[1];
      const ponderMove = parts[3];
      this.onBestMoveCallbacks.forEach(callback => callback(bestMove, ponderMove));
    }
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

  private async waitForReady(): Promise<void> {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (this.isReady) {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }

  async analyze(fen: string, depth: number = 20): Promise<void> {
    if (!this.worker || !this.isReady) {
      await this.initialize();
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
    if (!this.worker || !this.isReady) {
      await this.initialize();
    }

    // Set MultiPV for multiple lines
    if (numLines !== this.multiPV) {
      this.multiPV = numLines;
      this.send(`setoption name MultiPV value ${numLines}`);
    }

    const lines: Map<number, EngineInfo> = new Map();
    const analysisComplete = new Promise<void>((resolve) => {
      const infoHandler = (info: EngineInfo) => {
        if (info.multipv) {
          lines.set(info.multipv, info);
        }
      };

      const bestMoveHandler = () => {
        this.onInfo(infoHandler, true);
        this.onBestMove(bestMoveHandler, true);
        resolve();
      };

      this.onInfo(infoHandler);
      this.onBestMove(bestMoveHandler);
    });

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
  }

  stop() {
    if (this.worker) {
      this.send('stop');
      this.analyzing = false;
    }
  }

  onInfo(callback: (info: EngineInfo) => void, remove: boolean = false) {
    if (remove) {
      this.onInfoCallbacks.delete(callback);
    } else {
      this.onInfoCallbacks.add(callback);
    }
  }

  onBestMove(callback: (move: string, ponder?: string) => void, remove: boolean = false) {
    if (remove) {
      this.onBestMoveCallbacks.delete(callback);
    } else {
      this.onBestMoveCallbacks.add(callback);
    }
  }

  setMultiPV(lines: number) {
    this.multiPV = lines;
    if (this.worker && this.isReady) {
      this.send(`setoption name MultiPV value ${lines}`);
    }
  }

  destroy() {
    this.stop();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.onInfoCallbacks.clear();
    this.onBestMoveCallbacks.clear();
  }
}

// Create and export singleton instance
export const stockfishEngine = new StockfishEngine();