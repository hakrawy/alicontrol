/**
 * Player Settings Service
 * 
 * Manages player settings that can be controlled from admin panel.
 * Settings are stored in the database and fetched on app load.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from '@/template';

const PLAYER_SETTINGS_KEY = 'player_settings';
const SUPABASE_TABLE = 'player_settings';

// Default player settings
export const DEFAULT_PLAYER_SETTINGS: PlayerSettings = {
  defaultQuality: 'auto',
  autoplay: true,
  showControls: true,
  enableSubtitles: true,
  defaultVolume: 1.0,
  enableFullscreen: true,
  enableSkipButtons: true,
  enableWatchHistory: true,
  enableContinueWatching: true,
  enableTrailerAutoplay: true,
  enableAutoNextEpisode: true,
  defaultPlaybackSpeed: 1.0,
  enableSourceSwitching: true,
  enableQualitySelector: true,
  enablePlaybackSpeedControl: true,
  enableSubtitleSelector: true,
  streamHealthCheck: true,
  retryOnFailure: true,
  maxRetries: 3,
};

// Player settings interface
export interface PlayerSettings {
  // Playback
  defaultQuality: 'auto' | '1080p' | '720p' | '480p' | '360p';
  autoplay: boolean;
  defaultVolume: number;
  defaultPlaybackSpeed: number;
  enableAutoNextEpisode: boolean;
  
  // UI
  showControls: boolean;
  enableFullscreen: boolean;
  enableSkipButtons: boolean;
  enableSourceSwitching: boolean;
  enableQualitySelector: boolean;
  enablePlaybackSpeedControl: boolean;
  enableSubtitleSelector: boolean;
  
  // Features
  enableSubtitles: boolean;
  enableWatchHistory: boolean;
  enableContinueWatching: boolean;
  enableTrailerAutoplay: boolean;
  streamHealthCheck: boolean;
  retryOnFailure: boolean;
  maxRetries: number;
}

// Load settings from storage
export async function loadPlayerSettings(): Promise<PlayerSettings> {
  try {
    // Try to load from Supabase first
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from(SUPABASE_TABLE)
        .select('settings')
        .limit(1)
        .maybeSingle();
      
      if (data?.settings) {
        return { ...DEFAULT_PLAYER_SETTINGS, ...data.settings };
      }
    }
  } catch (error) {
    console.log('Failed to load from Supabase, trying local storage');
  }

  // Fallback to local storage
  try {
    const stored = await AsyncStorage.getItem(PLAYER_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_PLAYER_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load player settings:', error);
  }

  return DEFAULT_PLAYER_SETTINGS;
}

// Save settings to storage
export async function savePlayerSettings(settings: PlayerSettings): Promise<void> {
  try {
    // Try to save to Supabase first
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from(SUPABASE_TABLE)
        .upsert({ 
          id: 'default', 
          settings,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      
      if (!error) {
        console.log('Player settings saved to Supabase');
        // Also save locally as backup
        await AsyncStorage.setItem(PLAYER_SETTINGS_KEY, JSON.stringify(settings));
        return;
      }
    }
  } catch (error) {
    console.log('Failed to save to Supabase, using local storage');
  }

  // Fallback to local storage
  await AsyncStorage.setItem(PLAYER_SETTINGS_KEY, JSON.stringify(settings));
}

// Reset to defaults
export async function resetPlayerSettings(): Promise<void> {
  await savePlayerSettings(DEFAULT_PLAYER_SETTINGS);
}

// Get a specific setting
export function getSetting<K extends keyof PlayerSettings>(
  settings: PlayerSettings, 
  key: K
): PlayerSettings[K] {
  return settings[key] ?? DEFAULT_PLAYER_SETTINGS[key];
}