# Sound System Documentation

## Overview

The chess evaluation app features a global sound effect system using audio files from Chess.com's CDN. The system loads and manages sounds outside of React for optimal performance, providing immediate audio feedback for user actions, game events, and achievements. Sounds are globally available and can be used anywhere in the application.

## Architecture

### Core Components

1. **Global Sound Manager (`app/lib/global-sounds.ts`)**
   - Singleton class that loads outside of React
   - Manages all audio operations globally
   - Audio pooling for overlapping playback (3 concurrent instances per sound)
   - Automatic preloading of essential sounds on initialization
   - Persists user preferences in localStorage
   - Volume control with master and effects levels
   - Available via `soundManager` global export

2. **Sound Settings UI (`app/components/SoundSettings.tsx`)**
   - User-facing controls in the header
   - Toggle sound on/off
   - Adjust master and effects volume
   - Test different sound effects
   - Modal interface for detailed settings

3. **Integration Points**
   - **Game Component**: Plays sounds for game start, evaluation results, achievements
   - **ChessgroundBoard**: Plays appropriate sounds for moves (regular, capture, castle, check, promotion, illegal)
   - **UI Controls**: Click sounds for buttons and interactions

## Available Sound Effects

### Move Sounds
- `move`: Standard piece movement
- `capture`: Piece capture
- `castle`: Castling move
- `check`: Move that gives check
- `promote`: Pawn promotion
- `illegal`: Invalid move attempt
- `premove`: Pre-move sound

### Game State Sounds
- `gameStart`: New puzzle begins
- `gameEnd`: Game completion
- `correct`: Evaluation within threshold (≤1 pawn difference)
- `incorrect`: Evaluation outside threshold
- `achievement`: Achievement unlocked

### UI Sounds
- `click`: Button/control interaction
- `notify`: General notification
- `tenseconds`: Time warning (for future timer feature)

## Usage

### Global Usage (Anywhere in the App)

```typescript
// Import the global functions directly
import { playSound } from '../lib/global-sounds';

// Use anywhere, even outside React components
function handleAction() {
  playSound('click');
  // ... perform action
}
```

### Usage in React Components with Hook

```typescript
import { useGlobalSound } from '../hooks/useGlobalSound';

function MyComponent() {
  const { playSound, settings } = useGlobalSound();
  
  const handleAction = () => {
    playSound('click');
    console.log('Sound enabled:', settings.enabled);
  };
}
```

### Preloading Sounds

```typescript
import { preloadSounds } from '../lib/global-sounds';

// Preload at any time, even before React renders
await preloadSounds([
  'gameStart', 'move', 'capture', 
  'correct', 'incorrect', 'achievement'
]);

// Or in a React component
import { useGlobalSound } from '../hooks/useGlobalSound';

function GameComponent() {
  const { preloadSounds } = useGlobalSound();
  
  useEffect(() => {
    preloadSounds(['gameStart', 'move', 'capture']);
  }, []);
}
```

### Move Sound Detection

```typescript
import { getMoveSound } from '../lib/sounds';

// Determine appropriate sound based on move properties
const moveSound = getMoveSound({
  captured: true,      // Piece was captured
  castling: false,     // Not a castling move
  check: true,        // Move gives check
  promotion: false    // Not a promotion
});
// Returns: 'check' (check takes priority)
```

### Evaluation Result Sound

```typescript
import { getEvalResultSound } from '../lib/sounds';

const difference = Math.abs(userGuess - actualEval);
const sound = getEvalResultSound(difference, 100);
// Returns 'correct' if ≤100 centipawns, 'incorrect' otherwise
```

## Volume Control

The system uses a two-tier volume control:
- **Master Volume**: Affects all sounds (0-100%)
- **Effects Volume**: Additional multiplier for sound effects (0-100%)
- **Effective Volume** = Master × Effects

## Persistence

User preferences are automatically saved to localStorage:
- Sound enabled/disabled state
- Master volume level
- Effects volume level

Settings persist across sessions and page reloads.

## Performance Considerations

1. **Global Initialization**: Sound system loads outside React, available immediately
2. **Audio Pooling**: Each sound has 3 pre-cloned instances for instant overlapping playback
3. **Automatic Preloading**: Essential sounds (move, click, correct, etc.) load on initialization
4. **Smart Caching**: Loaded sounds are cached globally to avoid repeated network requests
5. **Dynamic Overflow**: If all pool instances are playing, creates temporary clones
6. **Automatic Cleanup**: Temporary clones are removed after playback
7. **Zero React Re-renders**: Sound operations don't trigger component updates

## Browser Compatibility

The system uses standard HTML5 Audio API, which is supported by all modern browsers:
- Chrome/Edge 4+
- Firefox 3.5+
- Safari 4+
- Opera 10.5+

## Future Enhancements

Potential improvements for the sound system:
1. Custom sound pack support
2. Per-sound-type volume controls
3. Sound themes (different sound sets)
4. Spatial audio for piece movements
5. Background music support
6. Voice announcements for moves/results

## Testing

Test the sound system by:
1. Click the speaker icon in the header to toggle sounds
2. Click the settings icon to open volume controls
3. Use test buttons to preview different sounds
4. Make moves on the board to hear move sounds
5. Submit evaluations to hear result sounds

## Global Access

The sound system can be accessed directly from the browser console for testing:
```javascript
// In browser console
__soundManager.play('move')
__soundManager.setVolume('master', 0.5)
__soundManager.getSettings()
```