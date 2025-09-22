# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Eval Rush is a Chess.com-style Puzzle Rush application built with Next.js 15, React 19, and TypeScript. Players guess chess position evaluations in timed or survival modes to improve their positional understanding.

## Commands

### Development
```bash
# Start development server
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

### Authentication & Sessions
- **NextAuth** with email magic links (no passwords)
- Database-driven user sessions (PostgreSQL/Prisma)
- JWT strategy for session management
- User state tracked in database, not localStorage

### Route Structure

#### Public Routes
- **`/`** - Landing page (redirects to dashboard if authenticated)
- **`/auth/signin`** - Email authentication page
- **`/auth/verify`** - Magic link verification page
- **`/analysis`** - Chess position analysis with Stockfish

#### Protected Routes (requires authentication)
- **`/dashboard`** - Mode selection and personal bests
- **`/rush/[id]`** - Active Puzzle Rush game
- **`/rush/[id]/results`** - Post-game review with position grid
- **`/leaderboard`** - Global and personal rankings

### Game Modes

1. **5-Minute Rush**: Solve as many puzzles as possible in 5 minutes
2. **Survival Mode**: No time limit, but one wrong answer ends the run

### Core Components

**BoardWrapper** (`app/components/BoardWrapper.tsx`)
- Pure board state manager
- Handles moves, board flipping, position reset
- Single responsibility principle

**ChessgroundBoard** (`app/components/ChessgroundBoard.tsx`)
- Chessground library wrapper
- Supports game and analysis modes
- Direct DOM manipulation for performance

**EvalBar** (`app/components/EvalBar.tsx`)
- Three modes: display, interactive, result
- Always shows evaluation value (no interaction required)
- Clean visual feedback for submissions

**ScorePanel** (`app/components/ScorePanel.tsx`)
- Simplified display for evaluation results
- Shows guess vs actual with analyze button
- Clean, minimal UI

### Database Schema

```prisma
model User {
  id            String         @id @default(cuid())
  email         String         @unique
  rushSessions  RushSession[]
}

model RushSession {
  id        String        @id @default(cuid())
  userId    String
  mode      RushMode      // FIVE_MINUTE or SURVIVAL
  score     Int           // Number of puzzles solved
  strikes   Int          // Wrong answers (configurable)
  attempts  RushAttempt[]
}

model RushAttempt {
  id         String    @id @default(cuid())
  sessionId  String
  puzzleId   String
  userGuess  Int       // In centipawns
  actualEval Int
  isCorrect  Boolean
}
```

### Configuration (`lib/game-config.ts`)

```typescript
EVAL_THRESHOLD: 400     // 4 pawns tolerance
MAX_STRIKES: 0          // Instant fail on wrong (configurable)
FIVE_MINUTE_TIME: 300000 // 5 minutes in milliseconds
```

### Key Implementation Details

#### Pass/Fail Rules
- Must guess correct side (sign)
- Must be within threshold (default 400 centipawns)
- Wrong side = instant fail regardless of threshold

#### Progressive Difficulty
- Base rating: 1500
- Increases by 25 rating points per puzzle solved
- Fetches puzzles within ±200 rating range

#### State Management
- All game state in database (no localStorage for game data)
- localStorage only for UI preferences (sound settings)
- Clean URLs without query parameters
- Session persistence through database

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl"

# Email Server (for magic links)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="email@gmail.com"
EMAIL_SERVER_PASSWORD="app-password"
EMAIL_FROM="noreply@evalrush.com"
```

## Development Best Practices

1. **Database-First**: All game state in database, not localStorage
2. **Clean URLs**: No state in URL parameters
3. **Single Flow**: One unified game flow, no competing implementations
4. **Type Safety**: Full TypeScript with Prisma-generated types
5. **Performance**: Direct DOM manipulation for chess board