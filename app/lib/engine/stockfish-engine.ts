/**
 * High-Performance Stockfish Engine Manager
 * 
 * This class provides a clean interface to the Stockfish engine running in a web worker.
 * Features:
 * - Web worker-based execution to prevent UI blocking
 * - Position caching for improved performance
 * - Debounced analysis to prevent excessive computations
 * - Multi-PV support for showing multiple variations
 * - Adaptive depth and time controls
 * - Memory management and cleanup
 */

export interface EngineEvaluation {
  type: 'cp' | 'mate';
  value: number;
}

export interface EngineAnalysis {
  depth: number;
  seldepth?: number;
  multipv: number;
  score: EngineEvaluation;
  nodes: number;
  nps: number;
  time: number;
  pv: string[];
  analysisId: number;
}

export interface EngineLine {
  multipv: number;
  score: EngineEvaluation;
  pv: string[];
  depth: number;
}

export interface EngineOptions {
  depth?: number;
  moveTime?: number;
  multiPV?: number;
  hashSize?: number;
  threads?: number;
  infinite?: boolean;
}

export interface EngineCallbacks {
  onReady?: () => void;
  onAnalysis?: (analysis: EngineAnalysis) => void;
  onBestMove?: (bestMove: string, ponder?: string) => void;
  onError?: (error: string) => void;
  onRaw?: (data: string) => void;
}

export class StockfishEngine {
  private worker: Worker | null = null;
  private isReady = false;
  private callbacks: EngineCallbacks = {};
  private analysisId = 0;
  private positionCache = new Map<string, EngineLine[]>();
  private debounceTimer: NodeJS.Timeout | null = null;
  private currentPosition: string | null = null;
  private isAnalyzing = false;
  private analysisLines = new Map<number, EngineLine>();

  constructor(callbacks: EngineCallbacks = {}) {
    this.callbacks = callbacks;
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      this.worker = new Worker('/stockfish-worker.js');
      
      this.worker.onmessage = (event) => {
        this.handleWorkerMessage(event.data);
      };
      
      this.worker.onerror = (error) => {
        console.error('Stockfish worker error:', error);
        this.callbacks.onError?.(`Worker error: ${error.message}`);
      };
      
      // Initialize the engine
      this.sendCommand('init');
      
    } catch (error) {
      console.error('Failed to initialize Stockfish worker:', error);
      this.callbacks.onError?.(`Failed to initialize engine: ${error}`);
    }
  }

  private handleWorkerMessage(message: any): void {
    switch (message.type) {
      case 'ready':
        this.isReady = true;
        this.callbacks.onReady?.();
        break;
        
      case 'analysis':
        // The message from worker already has the right structure
        if ('depth' in message && 'score' in message && 'pv' in message) {
          this.handleAnalysis(message as EngineAnalysis);
        }
        break;
        
      case 'bestmove':
        this.isAnalyzing = false;
        if (message.bestMove) {
          this.callbacks.onBestMove?.(message.bestMove, message.ponder);
        }
        break;

      case 'cache_cleared':
        // Cache has been cleared in worker
        break;

      case 'stats':
        // Performance stats received
        if (this.callbacks.onRaw) {
          this.callbacks.onRaw(`Stats: ${JSON.stringify(message.stats)}`);
        }
        break;
        
      case 'error':
        console.error('Stockfish error:', message.error);
        this.callbacks.onError?.(message.error);
        break;
        
      case 'raw':
        this.callbacks.onRaw?.(message.data);
        break;
    }
  }

  private handleAnalysis(analysis: EngineAnalysis): void {
    // Store the analysis line
    this.analysisLines.set(analysis.multipv, {
      multipv: analysis.multipv,
      score: analysis.score,
      pv: analysis.pv,
      depth: analysis.depth
    });
    
    // Cache the position analysis if it's deep enough
    if (analysis.depth >= 12 && this.currentPosition) {
      this.positionCache.set(this.currentPosition, Array.from(this.analysisLines.values()));
    }
    
    this.callbacks.onAnalysis?.(analysis);
  }

  private sendCommand(type: string, data: any = {}): void {
    if (!this.worker) {
      this.callbacks.onError?.('Engine not initialized');
      return;
    }
    
    this.worker.postMessage({ type, ...data });
  }

  /**
   * Analyze a chess position
   */
  public analyze(fen: string, moves: string[] = [], options: EngineOptions = {}): void {
    if (!this.isReady) {
      this.callbacks.onError?.('Engine not ready');
      return;
    }

    // Check cache first
    const cacheKey = this.getCacheKey(fen, moves);
    if (this.positionCache.has(cacheKey) && !options.infinite) {
      const cachedLines = this.positionCache.get(cacheKey)!;
      // Emit cached analysis
      setTimeout(() => {
        cachedLines.forEach((line) => {
          this.callbacks.onAnalysis?.({
            depth: line.depth,
            multipv: line.multipv,
            score: line.score,
            nodes: 0,
            nps: 0,
            time: 0,
            pv: line.pv,
            analysisId: this.analysisId
          });
        });
      }, 10);
      return;
    }

    this.currentPosition = cacheKey;
    this.analysisLines.clear();
    this.isAnalyzing = true;
    
    const analysisOptions = {
      fen,
      moves,
      analysisId: ++this.analysisId,
      depth: options.depth || 15,
      moveTime: options.moveTime,
      multiPV: options.multiPV || 3,
      hashSize: options.hashSize || 128,
      threads: options.threads || 1,
      infinite: options.infinite || false
    };
    
    this.sendCommand('analyze', analysisOptions);
  }

  /**
   * Analyze with debouncing to prevent excessive analysis during rapid position changes
   */
  public analyzeDebounced(fen: string, moves: string[] = [], options: EngineOptions = {}, debounceMs = 300): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.analyze(fen, moves, options);
    }, debounceMs);
  }

  /**
   * Stop current analysis
   */
  public stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    if (this.isAnalyzing) {
      this.sendCommand('stop');
      this.isAnalyzing = false;
    }
  }

  /**
   * Get the best move for a position
   */
  public getBestMove(fen: string, moves: string[] = [], options: EngineOptions = {}): void {
    this.analyze(fen, moves, { ...options, multiPV: 1 });
  }

  /**
   * Get current analysis lines
   */
  public getCurrentLines(): EngineLine[] {
    return Array.from(this.analysisLines.values()).sort((a, b) => a.multipv - b.multipv);
  }

  /**
   * Check if engine is ready
   */
  public getIsReady(): boolean {
    return this.isReady;
  }

  /**
   * Check if currently analyzing
   */
  public getIsAnalyzing(): boolean {
    return this.isAnalyzing;
  }

  /**
   * Clear position cache
   */
  public clearCache(): void {
    this.positionCache.clear();
    // Also clear worker cache
    this.sendCommand('clear_cache');
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): void {
    this.sendCommand('get_stats');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; positions: string[] } {
    return {
      size: this.positionCache.size,
      positions: Array.from(this.positionCache.keys())
    };
  }

  /**
   * Destroy the engine and cleanup resources
   */
  public destroy(): void {
    this.stop();
    
    if (this.worker) {
      this.sendCommand('quit');
      this.worker.terminate();
      this.worker = null;
    }
    
    this.isReady = false;
    this.positionCache.clear();
    this.analysisLines.clear();
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private getCacheKey(fen: string, moves: string[]): string {
    return `${fen}|${moves.join(',')}`;
  }
}

// Singleton instance for global use
let globalEngine: StockfishEngine | null = null;

/**
 * Get or create the global Stockfish engine instance
 */
export function getStockfishEngine(callbacks?: EngineCallbacks): StockfishEngine {
  if (!globalEngine) {
    globalEngine = new StockfishEngine(callbacks);
  } else if (callbacks) {
    // Update callbacks if provided
    globalEngine['callbacks'] = { ...globalEngine['callbacks'], ...callbacks };
  }
  
  return globalEngine;
}

/**
 * Cleanup global engine instance
 */
export function destroyGlobalEngine(): void {
  if (globalEngine) {
    globalEngine.destroy();
    globalEngine = null;
  }
}
