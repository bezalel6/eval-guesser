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

### Core Components

**PuzzleDisplay** (`app/components/PuzzleDisplay.tsx`)
- Main game component managing evaluation guessing flow
- Handles board state, user interactions, and scoring
- Features:
  - Auto-orientation to player to move
  - Single premove support from puzzle position
  - Progressive UI disclosure (eval slider activates on interaction)
  - Streak tracking and scoring system

**ChessgroundBoard** (`app/components/ChessgroundBoard.tsx`)
- Wrapper around vanilla chessground library for performance
- Manages board rendering without React re-renders
- Supports premoves, check indication, and legal move highlighting

### State Management

The app uses React state with performance optimizations:
- Local slider state to prevent re-renders during dragging
- Board modifications tracked separately from FEN state
- Premove state managed through chessground's native API
- Manual board orientation override with flip button

### API Architecture

Routes in `app/api/puzzles/` connect to SQLite database via Prisma ORM:
- PuzzleService singleton manages database queries with caching
- Endpoints: `/random`, `/by-rating`, `/by-theme`, `/stats`, `/[id]`
- Efficient random puzzle selection using OFFSET with cached count

### Styling Architecture

- Dark mode theme with CSS variables in `globals.css`
- Material-UI components for controls
- Native HTML range input for performance (replaced MUI Slider)
- Chessground styles imported directly
- Unified board and eval bar design

## Key Implementation Details

### Performance Optimizations

1. **Chessground over React-chessboard**: Direct DOM manipulation avoids React reconciliation
2. **Native range slider**: Eliminated 340ms GPU bottleneck from MUI Slider
3. **React.memo and useMemo**: Prevent unnecessary component re-renders
4. **Local state for slider**: Updates only commit on release

### Board Interaction Logic

- Board allows moves only from original puzzle position
- After any move (including premove), board becomes view-only
- Reset button appears only when position is modified
- Legal moves calculated via chess.js and passed to chessground

### Evaluation System

- Evaluations in centipawns, displayed as decimal pawns (110 → 1.1)
- Streak counts correct guesses within 100 centipawns (1 pawn)
- Score calculation: `max(0, 1000 - difference)`
- Computer evaluation revealed only after submission

### UI/UX Flow

1. Board auto-orients to player to move
2. Eval slider starts invisible, activates on first interaction
3. Submit button appears only after eval interaction
4. After submission: shows actual eval, difference, and next button in side panel
5. Loading overlays board instead of replacing

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

## Development Tools

- **react-scan**: Re-render visualization in development
- **Prisma Studio**: Database GUI at `npx prisma studio`
- **portio**: Port protection in dev script
- **ESLint**: Configured for TypeScript and React