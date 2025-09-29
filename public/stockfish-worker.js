// Stockfish.js Web Worker Wrapper
// This wrapper intercepts and processes Stockfish output for structured communication

let isReady = false;
let isInitializing = false;
let currentAnalysisId = 0;

// Import Stockfish which sets up its own message handling
// The stockfish.js file uses Module.print to send output via postMessage
importScripts('/stockfish.js');

// Store the original postMessage function
const originalPostMessage = self.postMessage;

// Intercept Stockfish's postMessage output
self.postMessage = function(line) {
    handleEngineOutput(line);
};

// Handle output from the Stockfish engine
function handleEngineOutput(line) {
    if (typeof line !== 'string') return;

    // Log output for debugging (skip repetitive uciok messages)
    if (!line.includes('uciok') && !line.includes('No such option')) {
        console.log('Engine:', line);
    }

    // Handle engine readiness (only once)
    if (line === 'uciok' && !isReady) {
        isReady = true;
        isInitializing = false;
        configureEngine();
        originalPostMessage({ type: 'ready' });
    }
    // Handle best move
    else if (line.startsWith('bestmove')) {
        const parts = line.split(' ');
        const bestMove = parts[1];
        const ponder = parts.length > 3 ? parts[3] : null;

        originalPostMessage({
            type: 'bestmove',
            bestMove,
            ponder,
            analysisId: currentAnalysisId
        });
    }
    // Handle evaluation info
    else if (line.startsWith('info') && line.includes('pv')) {
        const info = parseInfoLine(line);
        if (info) {
            originalPostMessage({
                type: 'analysis',
                ...info,
                analysisId: currentAnalysisId
            });
        }
    }
}

// UCI Protocol Important Note:
// According to UCI specification, scores are from the SIDE-TO-MOVE perspective:
// - When White to move: positive = good for White, negative = good for Black
// - When Black to move: positive = good for Black, negative = good for White
// We normalize to always show from White's perspective for consistency

// Helper function to determine if it's Black's turn from FEN
function isBlackTurn(fen) {
    if (!fen) return false;
    // FEN format: pieces activeColor castling enPassant halfmove fullmove
    // The active color is the second part, after the first space
    const parts = fen.split(' ');
    return parts[1] === 'b';
}

// Parse UCI info line
function parseInfoLine(line) {
    if (!line.includes('depth') || !line.includes('score')) {
        return null;
    }

    const info = {
        depth: 0,
        seldepth: 0,
        multipv: 1,
        score: null,
        nodes: 0,
        nps: 0,
        time: 0,
        pv: []
    };

    const parts = line.split(' ');
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
                    let value = parseInt(parts[++i]);
                    // UCI gives scores from side-to-move perspective
                    // Normalize to White's perspective when Black is to move
                    if (currentPositionBlackToMove) {
                        value = -value;
                    }
                    info.score = { type: 'cp', value: value };
                } else if (parts[i] === 'mate') {
                    let value = parseInt(parts[++i]);
                    // Same for mate scores - normalize to White's perspective
                    if (currentPositionBlackToMove) {
                        value = -value;
                    }
                    info.score = { type: 'mate', value: value };
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
            case 'pv':
                info.pv = parts.slice(++i);
                i = parts.length; // Exit loop
                break;
            default:
                i++;
        }
    }

    // Only return if we have meaningful data
    if (info.depth >= 1 && info.score && info.pv.length > 0) {
        return info;
    }

    return null;
}

// Send command to engine
// The stockfish.js module reads commands from a custom onmessage handler
function sendEngineCommand(cmd) {
    // The stockfish.js module expects postMessage commands directly
    // It overrides the worker's onmessage handler to receive UCI commands
    if (typeof onmessage === 'function') {
        // Simulate a message event
        onmessage({ data: cmd });
    } else {
        console.error('Cannot send command to engine - onmessage not available');
    }
}

// Configure engine with optimal settings
function configureEngine() {
    // Use very conservative settings due to WASM memory constraints
    // The default hash size is 16MB which should work fine
    sendEngineCommand('setoption name Ponder value false');
    sendEngineCommand('setoption name Threads value 1');
    sendEngineCommand('setoption name MultiPV value 3');
    // Don't set Hash - use the default to avoid memory issues
}

// Initialize engine
function initializeEngine() {
    if (isInitializing || isReady) {
        console.log('Engine already initialized or initializing');
        return;
    }

    isInitializing = true;
    console.log('Initializing Stockfish engine...');

    // Send initial UCI command after module loads
    setTimeout(() => {
        sendEngineCommand('uci');
    }, 100);
}

// Track whether Black is to move for score normalization
let currentPositionBlackToMove = false;

// Analyze position
function analyzePosition(data) {
    if (!isReady) {
        originalPostMessage({
            type: 'error',
            error: 'Engine not ready'
        });
        return;
    }

    currentAnalysisId = data.analysisId || ++currentAnalysisId;

    // Determine who is to move from the FEN
    const fen = data.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    currentPositionBlackToMove = isBlackTurn(fen);

    // If moves are provided, toggle turn for each move
    if (data.moves && data.moves.length > 0) {
        // Each move toggles the turn
        if (data.moves.length % 2 === 1) {
            currentPositionBlackToMove = !currentPositionBlackToMove;
        }
    }

    // Stop any ongoing analysis
    sendEngineCommand('stop');

    // Small delay to ensure stop is processed
    setTimeout(() => {
        // Set position
        if (data.fen && data.fen !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
            const movesCmd = data.moves && data.moves.length > 0
                ? ` moves ${data.moves.join(' ')}`
                : '';
            sendEngineCommand(`position fen ${data.fen}${movesCmd}`);
        } else if (data.moves && data.moves.length > 0) {
            sendEngineCommand(`position startpos moves ${data.moves.join(' ')}`);
        } else {
            sendEngineCommand('position startpos');
        }

        // Configure analysis parameters
        const multiPV = Math.min(data.multiPV || 3, 10);
        sendEngineCommand(`setoption name MultiPV value ${multiPV}`);

        // Start analysis
        if (data.infinite) {
            sendEngineCommand('go infinite');
        } else {
            const depth = Math.min(data.depth || 15, 20);
            const moveTime = data.moveTime || 1000;

            if (depth <= 10) {
                sendEngineCommand(`go depth ${depth}`);
            } else {
                sendEngineCommand(`go movetime ${moveTime} depth ${depth}`);
            }
        }
    }, 50);
}

// Store the original onmessage handler that stockfish.js creates
let stockfishOnMessage = null;

// Handle messages from main thread
self.addEventListener('message', function(event) {
    // Check if this is from stockfish.js setting up its handler
    if (!stockfishOnMessage && typeof onmessage === 'function' && onmessage !== this) {
        stockfishOnMessage = onmessage;
    }

    const { type, ...data } = event.data;

    switch (type) {
        case 'init':
            initializeEngine();
            break;

        case 'analyze':
            analyzePosition(data);
            break;

        case 'stop':
            sendEngineCommand('stop');
            break;

        case 'quit':
            sendEngineCommand('quit');
            isReady = false;
            break;

        default:
            // If it's not a command we recognize, it might be a UCI command
            // Pass it directly to stockfish
            if (stockfishOnMessage) {
                stockfishOnMessage(event);
            }
    }
});

// Initialize engine when worker loads
initializeEngine();