# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Eval Guesser is a chess position evaluation training application built with Next.js 15, React 19, and TypeScript. Players guess the computer evaluation of chess positions to improve their positional understanding.

## Commands

### Development
```bash
# Start development server with port protection
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Run ESLint
npm run lint
```

### Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Apply database migrations
npx prisma migrate dev

# View database in Prisma Studio
npx prisma studio

# Import puzzles from CSV
node scripts/import-puzzles.js puzzles.csv
```

## Architecture

### Route Structure

- **`/`** - Landing page with navigation to game modes
- **`/play/classic`** - Classic evaluation guessing game
- **`/analysis`** - Position analysis with Stockfish engine

### Core Components (Consolidated)

**Game** (`app/components/Game.tsx`)
- Main game controller managing evaluation guessing flow
- Handles game state through useGameReducer hook
- Features:
  - Auto-progression after 2 seconds on correct answer
  - Sound effects for game events
  - Achievement tracking and notifications
  - Theme-based puzzle selection

**ChessgroundBoard** (`app/components/ChessgroundBoard.tsx`)
- Unified board component with game and analysis modes
- Uses callback ref pattern for reliable DOM initialization
- Supports:
  - Game mode: Basic move display and interactions
  - Analysis mode: Full engine analysis, keyboard navigation, promotion handling
  - Arrow display for engine analysis lines
  - Sound effects for different move types

**EvalBar** (`app/components/EvalBar.tsx`)
- Unified evaluation bar with three modes:
  - `display`: Static evaluation display for analysis
  - `interactive`: Draggable bar for guessing (always shows value)
  - `result`: Shows both user guess and actual evaluation
- No interaction required to see evaluation value
- Submit button always visible in interactive mode

**BoardLayout** (`app/components/BoardLayout.tsx`)
- Unified layout component with variants:
  - `game`: Layout for game mode with score panel
  - `analysis`: Layout for analysis mode with sidebar
- Handles responsive design and component positioning
- Clean composition pattern for child components

**BoardWrapper** (`app/components/BoardWrapper.tsx`)
- Pure board state manager without layout responsibilities
- Handles move logic, board flipping, position reset
- Focused single responsibility

### State Management

The app uses React state with performance optimizations:
- Game state managed by useGameReducer hook
- Callback refs for reliable DOM element access
- Local state for UI interactions to prevent re-renders
- Session persistence via localStorage for high scores

### API Architecture

Routes in `app/api/puzzles/` connect to SQLite database via Prisma ORM:
- PuzzleService singleton manages database queries with caching
- Endpoints: `/random`, `/by-rating`, `/by-theme`, `/stats`, `/[id]`, `/[id]/solution`
- Random puzzle endpoint supports `?includeSolution=true` parameter
- Efficient random puzzle selection using OFFSET with cached count

### Styling Architecture

- Dark mode theme with CSS variables in `globals.css`
- Material-UI components for controls
- Chessground styles imported directly
- Unified board and eval bar design
- Responsive layouts with flexbox

## Key Implementation Details

### Recent Architectural Improvements

1. **Component Consolidation (40% reduction)**:
   - Merged 3 eval components into unified EvalBar
   - Merged 3 layout components into unified BoardLayout
   - Merged 2 error boundaries into single ErrorBoundary
   - Enhanced ChessgroundBoard with analysis mode support
   - Removed unnecessary abstractions and wrapper components

2. **Proper Navigation Pattern**:
   - Homepage is pure landing page without puzzle fetching
   - Game modes use dedicated routes (`/play/classic`)
   - Clean separation between navigation and game logic
   - Follows Next.js routing conventions

3. **Reliable Board Initialization**:
   - Callback ref pattern ensures DOM element exists
   - Proper cleanup on unmount
   - Error handling for Chessground initialization
   - Safe drawable configuration

### Performance Optimizations

1. **Chessground over React-chessboard**: Direct DOM manipulation avoids React reconciliation
2. **Callback refs over useRef**: Ensures DOM elements are ready before initialization
3. **React.memo and useMemo**: Prevent unnecessary component re-renders
4. **Route-based code splitting**: Homepage only 2.36 kB, game logic loaded on demand

### Board Interaction Logic

- Board allows moves only from original puzzle position
- After any move (including premove), board becomes view-only
- Reset button appears only when position is modified
- Legal moves calculated via chess.js and passed to chessground
- Promotion handling in analysis mode with dialog

### Evaluation System

- Evaluations in centipawns, displayed as decimal pawns (110 → 1.1)
- **Streak threshold**: 150 centipawns (1.5 pawns) - more lenient
- **Scoring tiers** (more generous):
  - Perfect: 0-30 centipawns
  - Excellent: 31-75 centipawns
  - Great: 76-150 centipawns
  - Good: 151-250 centipawns
- Computer evaluation revealed only after submission

### UI/UX Flow

1. Board auto-orients to player to move
2. **Eval bar always shows current value** (no interaction needed)
3. Submit button always visible when ready
4. After submission: shows actual eval, difference, auto-progresses in 2s
5. Sound feedback for correct/incorrect based on 150cp threshold

## Environment Variables

```bash
DATABASE_URL="file:./puzzles.db"
```

## Database Schema

SQLite database with single `puzzles` table:
- `PuzzleId` (primary key)
- `FEN` - chess position
- `Rating` - evaluation in centipawns
- `Moves` - solution moves
- `Themes`, `Popularity`, `NbPlays` - metadata
- Indexed on Rating, Themes, and Popularity

## Next.js 15 Specific Considerations

- API route params must be awaited: `const { id } = await params`
- Use `type` imports for types from external packages
- ESLint configured with flat config format (eslint.config.mjs)
- Client components properly separated from server-side logic
- Prisma only used in API routes, never in client components

## Development Tools

- **react-scan**: Re-render visualization in development
- **Prisma Studio**: Database GUI at `npx prisma studio`
- **portio**: Port protection in dev script
- **ESLint**: Configured for TypeScript and React
- **Turbopack**: Fast bundler with `--turbo` flag