'use client';

import { useEffect, useState, useCallback } from 'react';
import { soundManager, type SoundEffect } from '../lib/global-sounds';

// React hook for using the global sound system
export function useGlobalSound() {
  const [settings, setSettings] = useState(soundManager.getSettings());

  useEffect(() => {
    // Subscribe to settings changes
    const unsubscribe = soundManager.subscribe((newSettings) => {
      setSettings(newSettings);
    });

    return unsubscribe;
  }, []);

  const playSound = useCallback((sound: SoundEffect) => {
    soundManager.play(sound);
  }, []);

  const preloadSounds = useCallback((sounds: SoundEffect[]) => {
    return soundManager.preloadAll(sounds);
  }, []);

  const setVolume = useCallback((type: 'master' | 'effects' | 'music', value: number) => {
    soundManager.setVolume(type, value);
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    soundManager.setEnabled(enabled);
  }, []);

  return {
    playSound,
    preloadSounds,
    setVolume,
    setEnabled,
    settings,
    soundManager, // Expose the manager for direct access if needed
  };
}