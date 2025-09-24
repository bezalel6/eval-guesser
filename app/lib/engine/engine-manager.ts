/**
 * Server-side Chess Engine Manager with SSE streaming
 * Manages Stockfish workers, sessions, and analysis queue
 */

import { Chess } from 'chess.js';
import type { 
  EngineInfo, 
  AnalysisLine, 
  EngineSession, 
  AnalysisResponse,
  EngineStatus
} from '../../types/engine';


interface StockfishWorker {
  id: string;
  worker: Worker;
  isActive: boolean;
  currentSession?: string;
  createdAt: number;
}

class EngineManager {
  private static instance: EngineManager;
  private workers: Map<string, StockfishWorker> = new Map();
  private sessions: Map<string, EngineSession> = new Map();
  private analysisQueue: string[] = [];
  private eventListeners: Map<string, Set<(response: AnalysisResponse) => void>> = new Map();
  private maxWorkers = 3;
  private workerIdleTimeout = 300000; // 5 minutes
  private sessionTimeout = 600000; // 10 minutes
  private cleanupInterval: NodeJS.Timeout;

  private constructor() {
    // Cleanup timer for idle resources
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleResources();
    }, 60000); // Check every minute
  }

  static getInstance(): EngineManager {
    if (!EngineManager.instance) {
      EngineManager.instance = new EngineManager();
    }
    return EngineManager.instance;
  }

  /**
   * Start analysis for a position
   */
  async startAnalysis(
    fen: string, 
    depth: number = 20, 
    multiPV: number = 3,
    sessionId?: string
  ): Promise<string> {
    const id = sessionId || this.generateSessionId();
    
    // Stop existing analysis for this session
    if (this.sessions.has(id)) {
      await this.stopAnalysis(id);
    }

    // Create new session
    const session: EngineSession = {
      id,
      fen,
      depth,
      multiPV,
      startedAt: Date.now(),
      isActive: true,
      lines: new Map(),
      bestEvaluation: null
    };

    this.sessions.set(id, session);
    
    // Get or create worker
    const worker = await this.getAvailableWorker();
    worker.currentSession = id;
    worker.isActive = true;

    try {
      // Configure worker
      await this.sendWorkerCommand(worker, `setoption name MultiPV value ${multiPV}`);
      await this.sendWorkerCommand(worker, `setoption name Threads value 2`);
      await this.sendWorkerCommand(worker, `setoption name Hash value 256`);
      
      // Set position and start analysis
      await this.sendWorkerCommand(worker, `position fen ${fen}`);
      await this.sendWorkerCommand(worker, `go infinite`);

      return id;
    } catch (error) {
      // Cleanup on error
      this.sessions.delete(id);
      worker.currentSession = undefined;
      worker.isActive = false;
      throw error;
    }
  }

  /**
   * Stop analysis for a session
   */
  async stopAnalysis(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      return false;
    }

    // Find worker handling this session
    const worker = Array.from(this.workers.values())
      .find(w => w.currentSession === sessionId);

    if (worker) {
      try {
        await this.sendWorkerCommand(worker, 'stop');
        worker.currentSession = undefined;
        worker.isActive = false;
      } catch (error) {
        console.error('Error stopping worker:', error);
      }
    }

    // Mark session as inactive
    session.isActive = false;
    
    // Notify listeners
    this.notifyListeners(sessionId, {
      sessionId,
      status: 'stopped',
      depth: session.lines.size > 0 ? Math.max(...Array.from(session.lines.values()).map(l => l.depth)) : 0,
      evaluation: session.bestEvaluation,
      lines: this.convertLinesToAnalysisLines(session.lines, session.fen)
    });

    return true;
  }

  /**
   * Get status of an analysis session
   */
  getSessionStatus(sessionId: string): EngineStatus | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return {
      sessionId,
      isAnalyzing: session.isActive,
      currentDepth: session.lines.size > 0 ? Math.max(...Array.from(session.lines.values()).map(l => l.depth)) : 0,
      currentFen: session.fen,
      startedAt: session.startedAt
    };
  }

  /**
   * Subscribe to analysis updates for a session
   */
  subscribe(sessionId: string, callback: (response: AnalysisResponse) => void): () => void {
    if (!this.eventListeners.has(sessionId)) {
      this.eventListeners.set(sessionId, new Set());
    }
    
    this.eventListeners.get(sessionId)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(sessionId);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.eventListeners.delete(sessionId);
        }
      }
    };
  }

  /**
   * Get or create an available worker
   */
  private async getAvailableWorker(): Promise<StockfishWorker> {
    // Find idle worker
    const idleWorker = Array.from(this.workers.values())
      .find(w => !w.isActive && !w.currentSession);
    
    if (idleWorker) {
      return idleWorker;
    }

    // Create new worker if under limit
    if (this.workers.size < this.maxWorkers) {
      return await this.createWorker();
    }

    // Wait for worker to become available (simple queue)
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const worker = Array.from(this.workers.values())
          .find(w => !w.isActive && !w.currentSession);
        
        if (worker) {
          clearInterval(checkInterval);
          resolve(worker);
        }
      }, 100);
    });
  }

  /**
   * Create a new Stockfish worker
   */
  private async createWorker(): Promise<StockfishWorker> {
    // Ensure we're in a browser environment
    if (typeof window === 'undefined') {
      throw new Error('Chess engine can only run in browser environment');
    }

    const id = this.generateSessionId();
    
    const worker = new Worker('/stockfish.js');
    
    const stockfishWorker: StockfishWorker = {
      id,
      worker,
      isActive: false,
      createdAt: Date.now()
    };

    // Setup message handling
    worker.onmessage = (event) => {
      this.handleWorkerMessage(stockfishWorker, event.data);
    };

    worker.onerror = (error) => {
      console.error(`Worker ${id} error:`, error);
      this.handleWorkerError(stockfishWorker, error);
    };

    this.workers.set(id, stockfishWorker);

    // Initialize worker
    await this.sendWorkerCommand(stockfishWorker, 'uci');
    await this.waitForWorkerReady(stockfishWorker);

    return stockfishWorker;
  }

  /**
   * Handle messages from Stockfish worker
   */
  private handleWorkerMessage(worker: StockfishWorker, message: string): void {
    if (!worker.currentSession) {
      return;
    }

    const session = this.sessions.get(worker.currentSession);
    if (!session || !session.isActive) {
      return;
    }

    try {
      // Parse UCI info messages
      if (message.startsWith('info')) {
        const info = this.parseInfo(message);
        if (info && info.depth && info.score && info.pv) {
          // Update session with new info
          session.lines.set(info.multipv || 1, info);
          
          // Update best evaluation
          if (info.multipv === 1 || !info.multipv) {
            session.bestEvaluation = {
              type: info.score.unit,
              value: info.score.value
            };
          }

          // Notify listeners
          this.notifyListeners(session.id, {
            sessionId: session.id,
            status: 'analyzing',
            depth: info.depth,
            evaluation: session.bestEvaluation,
            lines: this.convertLinesToAnalysisLines(session.lines, session.fen)
          });
        }
      }

      // Handle best move (analysis complete)
      if (message.startsWith('bestmove')) {
        session.isActive = false;
        worker.currentSession = undefined;
        worker.isActive = false;

        this.notifyListeners(session.id, {
          sessionId: session.id,
          status: 'completed',
          depth: session.lines.size > 0 ? Math.max(...Array.from(session.lines.values()).map(l => l.depth)) : 0,
          evaluation: session.bestEvaluation,
          lines: this.convertLinesToAnalysisLines(session.lines, session.fen)
        });
      }
    } catch (error) {
      console.error('Error handling worker message:', error);
      this.handleWorkerError(worker, new Error('Message parsing error'));
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(worker: StockfishWorker, error: Error): void {
    if (worker.currentSession) {
      const session = this.sessions.get(worker.currentSession);
      if (session) {
        session.isActive = false;
        
        this.notifyListeners(worker.currentSession, {
          sessionId: worker.currentSession,
          status: 'error',
          depth: 0,
          evaluation: null,
          lines: [],
          error: error.message || 'Engine error'
        });
      }
    }

    // Cleanup worker
    worker.worker.terminate();
    this.workers.delete(worker.id);
  }

  /**
   * Send command to worker with promise
   */
  private sendWorkerCommand(worker: StockfishWorker, command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        worker.worker.postMessage(command);
        // For most commands, we resolve immediately
        // For commands that need response, implement specific handling
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Wait for worker to become ready
   */
  private waitForWorkerReady(worker: StockfishWorker): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker initialization timeout'));
      }, 10000);

      const originalOnMessage = worker.worker.onmessage;
      
      worker.worker.onmessage = (event) => {
        if (event.data === 'uciok') {
          clearTimeout(timeout);
          worker.worker.onmessage = originalOnMessage;
          resolve();
        }
      };
    });
  }

  /**
   * Notify all listeners for a session
   */
  private notifyListeners(sessionId: string, response: AnalysisResponse): void {
    const listeners = this.eventListeners.get(sessionId);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(response);
        } catch (error) {
          console.error('Error in listener callback:', error);
        }
      });
    }
  }

  /**
   * Convert engine lines to analysis format
   */
  private convertLinesToAnalysisLines(lines: Map<number, EngineInfo>, fen: string): AnalysisLine[] {
    const result: AnalysisLine[] = [];

    Array.from(lines.values())
      .sort((a, b) => (a.multipv || 1) - (b.multipv || 1))
      .forEach(info => {
        const moves = info.pv.split(' ').filter(m => m);
        const san: string[] = [];
        
        try {
          const tempChess = new Chess(fen);
          moves.forEach(move => {
            if (move.length >= 4) {
              const from = move.slice(0, 2);
              const to = move.slice(2, 4);
              const promotion = move[4] as 'q' | 'r' | 'b' | 'n' | undefined;
              
              const chessMove = tempChess.move({
                from,
                to,
                promotion
              });
              
              if (chessMove) {
                san.push(chessMove.san);
              }
            }
          });
        } catch (e) {
          console.warn('Failed to convert moves to SAN:', e);
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
      });

    return result;
  }

  /**
   * Parse UCI info message
   */
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

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup idle resources
   */
  private cleanupIdleResources(): void {
    const now = Date.now();

    // Cleanup idle workers
    Array.from(this.workers.values()).forEach(worker => {
      if (!worker.isActive && !worker.currentSession && 
          (now - worker.createdAt) > this.workerIdleTimeout) {
        worker.worker.terminate();
        this.workers.delete(worker.id);
      }
    });

    // Cleanup old sessions
    Array.from(this.sessions.values()).forEach(session => {
      if (!session.isActive && (now - session.startedAt) > this.sessionTimeout) {
        this.eventListeners.delete(session.id);
        this.sessions.delete(session.id);
      }
    });
  }

  /**
   * Cleanup all resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Stop all sessions
    Array.from(this.sessions.keys()).forEach(sessionId => {
      this.stopAnalysis(sessionId);
    });

    // Terminate all workers
    Array.from(this.workers.values()).forEach(worker => {
      worker.worker.terminate();
    });

    this.workers.clear();
    this.sessions.clear();
    this.eventListeners.clear();
  }
}

export default EngineManager;