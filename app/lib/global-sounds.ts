// Global sound system - loads and manages sounds outside of React
// This file initializes immediately when imported, providing a singleton instance

// Sound effect URLs from chess.com CDN
const SOUND_URLS = {
  // Move sounds
  move: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3',
  capture: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3',
  castle: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/castle.mp3',
  check: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-check.mp3',
  promote: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/promote.mp3',
  illegal: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/illegal.mp3',
  premove: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/premove.mp3',
  
  // Game state sounds
  gameStart: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-start.mp3',
  gameEnd: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-end.mp3',
  
  // Puzzle/evaluation sounds  
  correct: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/puzzle-correct.mp3',
  incorrect: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/puzzle-wrong.mp3',
  achievement: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/achievement.mp3',
  
  // UI interaction sounds
  click: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/click.mp3',
  notify: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/notify.mp3',
  tenseconds: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/tenseconds.mp3',
} as const;

export type SoundEffect = keyof typeof SOUND_URLS;

// Volume settings interface
interface VolumeSettings {
  master: number;
  effects: number;
  music: number;
}

interface SoundSettings {
  enabled: boolean;
  volumes: VolumeSettings;
}

// Global sound manager class
class GlobalSoundManager {
  private audioCache: Map<SoundEffect, HTMLAudioElement> = new Map();
  private audioPool: Map<SoundEffect, HTMLAudioElement[]> = new Map();
  private poolSize = 3; // Number of clones per sound for overlapping playback
  private volumes: VolumeSettings = {
    master: 0.7,
    effects: 0.8,
    music: 0.5,
  };
  private enabled: boolean = true;
  private preloadPromises: Map<SoundEffect, Promise<void>> = new Map();
  private initialized = false;
  private listeners: Set<(settings: SoundSettings) => void> = new Set();

  constructor() {
    // Initialize only in browser environment
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private initialize() {
    if (this.initialized) return;
    
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('soundSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        this.volumes = settings.volumes || this.volumes;
        this.enabled = settings.enabled ?? this.enabled;
      } catch (e) {
        console.warn('Failed to load sound settings:', e);
      }
    }

    // Preload essential sounds immediately
    this.preloadEssentialSounds();
    
    this.initialized = true;
  }

  private async preloadEssentialSounds() {
    const essentialSounds: SoundEffect[] = [
      'move', 'capture', 'click', 'correct', 'incorrect', 'gameStart'
    ];
    
    // Preload in parallel
    await Promise.all(
      essentialSounds.map(sound => this.preload(sound))
    ).catch(err => {
      console.warn('Some essential sounds failed to preload:', err);
    });
  }

  // Create an audio pool for a sound to enable overlapping playback
  private createAudioPool(sound: SoundEffect, audio: HTMLAudioElement): void {
    const pool: HTMLAudioElement[] = [audio];
    
    // Create clones for the pool
    for (let i = 1; i < this.poolSize; i++) {
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = this.getEffectiveVolume();
      pool.push(clone);
    }
    
    this.audioPool.set(sound, pool);
  }

  // Get an available audio element from the pool
  private getFromPool(sound: SoundEffect): HTMLAudioElement | null {
    const pool = this.audioPool.get(sound);
    if (!pool || pool.length === 0) return null;
    
    // Find an audio element that's not currently playing
    for (const audio of pool) {
      if (audio.paused || audio.ended) {
        return audio;
      }
    }
    
    // If all are playing, clone a new one temporarily
    const clone = pool[0].cloneNode() as HTMLAudioElement;
    clone.volume = this.getEffectiveVolume();
    
    // Clean up after playing
    clone.addEventListener('ended', () => {
      setTimeout(() => clone.remove(), 100);
    }, { once: true });
    
    return clone;
  }

  // Preload a sound effect
  async preload(sound: SoundEffect): Promise<void> {
    // Skip if not in browser
    if (typeof window === 'undefined') return;

    // Return existing promise if already preloading
    if (this.preloadPromises.has(sound)) {
      return this.preloadPromises.get(sound);
    }

    // Return if already cached
    if (this.audioCache.has(sound)) {
      return Promise.resolve();
    }

    const promise = new Promise<void>((resolve, reject) => {
      const audio = new Audio();
      audio.volume = this.getEffectiveVolume();
      audio.preload = 'auto';
      
      const handleLoad = () => {
        this.audioCache.set(sound, audio);
        this.createAudioPool(sound, audio);
        this.preloadPromises.delete(sound);
        resolve();
      };

      const handleError = (error: Event) => {
        console.warn(`Failed to preload sound: ${sound}`, error);
        this.preloadPromises.delete(sound);
        reject(error);
      };

      audio.addEventListener('canplaythrough', handleLoad, { once: true });
      audio.addEventListener('error', handleError, { once: true });
      
      // Set source and start loading
      audio.src = SOUND_URLS[sound];
      audio.load();
    });

    this.preloadPromises.set(sound, promise);
    return promise;
  }

  // Preload multiple sounds
  async preloadAll(sounds: SoundEffect[]): Promise<void> {
    if (typeof window === 'undefined') return;
    
    await Promise.all(sounds.map(sound => this.preload(sound)));
  }

  // Play a sound effect immediately
  play(sound: SoundEffect): void {
    // Skip if not in browser or sounds disabled
    if (typeof window === 'undefined' || !this.enabled) return;

    // Try to get from pool first
    const audio = this.getFromPool(sound);
    if (audio) {
      audio.currentTime = 0;
      audio.volume = this.getEffectiveVolume();
      audio.play().catch(e => {
        console.warn(`Failed to play sound: ${sound}`, e);
      });
      return;
    }

    // Fallback: preload and play
    this.preload(sound).then(() => {
      const poolAudio = this.getFromPool(sound);
      if (poolAudio) {
        poolAudio.currentTime = 0;
        poolAudio.play().catch(e => {
          console.warn(`Failed to play sound after preload: ${sound}`, e);
        });
      }
    }).catch(err => {
      console.warn(`Could not play sound: ${sound}`, err);
    });
  }

  // Get effective volume (master * effects)
  private getEffectiveVolume(): number {
    return Math.max(0, Math.min(1, this.volumes.master * this.volumes.effects));
  }

  // Update volume settings
  setVolume(type: keyof VolumeSettings, value: number): void {
    this.volumes[type] = Math.max(0, Math.min(1, value));
    this.saveSettings();
    this.updateAllVolumes();
    this.notifyListeners();
  }

  // Update all cached audio volumes
  private updateAllVolumes(): void {
    const volume = this.getEffectiveVolume();
    
    // Update cache
    this.audioCache.forEach(audio => {
      audio.volume = volume;
    });
    
    // Update pools
    this.audioPool.forEach(pool => {
      pool.forEach(audio => {
        audio.volume = volume;
      });
    });
  }

  // Toggle sound on/off
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.saveSettings();
    this.notifyListeners();
  }

  // Get current settings
  getSettings(): SoundSettings {
    return {
      enabled: this.enabled,
      volumes: { ...this.volumes },
    };
  }

  // Subscribe to settings changes
  subscribe(listener: (settings: SoundSettings) => void): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners of settings change
  private notifyListeners(): void {
    const settings = this.getSettings();
    this.listeners.forEach(listener => listener(settings));
  }

  // Save settings to localStorage
  private saveSettings(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('soundSettings', JSON.stringify({
        enabled: this.enabled,
        volumes: this.volumes,
      }));
    }
  }

  // Clear cache (useful for memory management)
  clearCache(): void {
    this.audioCache.clear();
    this.audioPool.clear();
    this.preloadPromises.clear();
  }

  // Cleanup method
  destroy(): void {
    this.clearCache();
    this.listeners.clear();
  }
}

// Create and export the global singleton instance
export const soundManager = new GlobalSoundManager();

// Helper functions that can be used anywhere

// Chess move sound helper
export function getMoveSound(move: {
  captured?: boolean;
  castling?: boolean;
  check?: boolean;
  promotion?: boolean;
}): SoundEffect {
  if (move.castling) return 'castle';
  if (move.promotion) return 'promote';
  if (move.check) return 'check';
  if (move.captured) return 'capture';
  return 'move';
}

// Evaluation result sound helper
export function getEvalResultSound(
  difference: number,
  threshold: number = 100
): SoundEffect {
  return Math.abs(difference) <= threshold ? 'correct' : 'incorrect';
}

// Convenience function for direct playback
export function playSound(sound: SoundEffect): void {
  soundManager.play(sound);
}

// Convenience function for preloading
export function preloadSounds(sounds: SoundEffect[]): Promise<void> {
  return soundManager.preloadAll(sounds);
}

// Auto-initialize on import in browser environment
if (typeof window !== 'undefined') {
  // Ensure sounds are ready as soon as possible
  (window as Window & { __soundManager?: GlobalSoundManager }).__soundManager = soundManager;
}