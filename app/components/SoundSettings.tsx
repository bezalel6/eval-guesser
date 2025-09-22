'use client';

import { useState } from 'react';
import { IconButton } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import { 
  Volume2, 
  Volume1
} from 'lucide-react';
import { useGlobalSound } from '@/app/hooks/useGlobalSound';

export default function SoundSettings() {
  const { settings, setEnabled, setVolume, playSound } = useGlobalSound();
  const [isOpen, setIsOpen] = useState(false);

  // Settings are now automatically updated via the hook

  const handleMasterVolumeChange = (value: number) => {
    setVolume('master', value);
    // Play a test sound
    playSound('click');
  };

  const handleEffectsVolumeChange = (value: number) => {
    setVolume('effects', value);
    playSound('move');
  };

  const toggleSound = () => {
    const newEnabled = !settings.enabled;
    setEnabled(newEnabled);
    if (newEnabled) {
      playSound('click');
    }
  };

  return (
    <>
      {/* Sound toggle button */}
      <IconButton
        onClick={toggleSound}
        color="inherit"
        size="small"
        title={settings.enabled ? 'Mute sounds' : 'Unmute sounds'}
      >
        {settings.enabled ? (
          <VolumeUpIcon />
        ) : (
          <VolumeOffIcon />
        )}
      </IconButton>

      {/* Settings button */}
      <IconButton
        onClick={() => setIsOpen(true)}
        color="inherit"
        size="small"
        title="Sound settings"
      >
        <SettingsIcon />
      </IconButton>

      {/* Settings modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-[90vw] shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Sound Settings</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-gray-700 transition-colors"
              >
                <CloseIcon className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Sound enabled toggle */}
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Sound Effects</span>
                <button
                  onClick={toggleSound}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    settings.enabled ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      settings.enabled ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Master volume */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-300 flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Master Volume
                  </label>
                  <span className="text-gray-400 text-sm">
                    {Math.round(settings.volumes.master * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.volumes.master * 100}
                  onChange={(e) => handleMasterVolumeChange(Number(e.target.value) / 100)}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  disabled={!settings.enabled}
                />
              </div>

              {/* Effects volume */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-300 flex items-center gap-2">
                    <Volume1 className="w-4 h-4" />
                    Effects Volume
                  </label>
                  <span className="text-gray-400 text-sm">
                    {Math.round(settings.volumes.effects * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.volumes.effects * 100}
                  onChange={(e) => handleEffectsVolumeChange(Number(e.target.value) / 100)}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  disabled={!settings.enabled}
                />
              </div>

              {/* Test sounds */}
              <div className="pt-4 border-t border-gray-700">
                <p className="text-gray-400 text-sm mb-3">Test Sounds:</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => playSound('move')}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300"
                    disabled={!settings.enabled}
                  >
                    Move
                  </button>
                  <button
                    onClick={() => playSound('capture')}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300"
                    disabled={!settings.enabled}
                  >
                    Capture
                  </button>
                  <button
                    onClick={() => playSound('correct')}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300"
                    disabled={!settings.enabled}
                  >
                    Correct
                  </button>
                  <button
                    onClick={() => playSound('incorrect')}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300"
                    disabled={!settings.enabled}
                  >
                    Wrong
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #10b981;
          border-radius: 50%;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #10b981;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }

        .slider:disabled::-webkit-slider-thumb {
          background: #6b7280;
          cursor: not-allowed;
        }
        
        .slider:disabled::-moz-range-thumb {
          background: #6b7280;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}