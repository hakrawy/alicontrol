/**
 * Player Settings Context
 * 
 * Provides global access to player settings throughout the app.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  PlayerSettings, 
  DEFAULT_PLAYER_SETTINGS, 
  loadPlayerSettings, 
  savePlayerSettings 
} from '../services/playerSettings';

interface PlayerSettingsContextType {
  settings: PlayerSettings;
  loading: boolean;
  updateSettings: (newSettings: Partial<PlayerSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const PlayerSettingsContext = createContext<PlayerSettingsContextType | undefined>(undefined);

export function PlayerSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PlayerSettings>(DEFAULT_PLAYER_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const loaded = await loadPlayerSettings();
      setSettings(loaded);
    } catch (error) {
      console.error('Failed to load player settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = useCallback(async (newSettings: Partial<PlayerSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await savePlayerSettings(updated);
  }, [settings]);

  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_PLAYER_SETTINGS);
    await savePlayerSettings(DEFAULT_PLAYER_SETTINGS);
  }, []);

  const refreshSettings = useCallback(async () => {
    await loadSettings();
  }, []);

  return (
    <PlayerSettingsContext.Provider
      value={{
        settings,
        loading,
        updateSettings,
        resetSettings,
        refreshSettings,
      }}
    >
      {children}
    </PlayerSettingsContext.Provider>
  );
}

export function usePlayerSettings() {
  const context = useContext(PlayerSettingsContext);
  if (!context) {
    throw new Error('usePlayerSettings must be used within PlayerSettingsProvider');
  }
  return context;
}

// Helper hook for specific setting
export function usePlayerSetting<K extends keyof PlayerSettings>(key: K): PlayerSettings[K] {
  const { settings } = usePlayerSettings();
  return settings[key] ?? DEFAULT_PLAYER_SETTINGS[key];
}