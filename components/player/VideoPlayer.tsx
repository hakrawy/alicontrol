/**
 * Premium Video Player
 * 
 * A professional Netflix-style streaming player with admin-controlled settings.
 * Features overlay controls, buffering UI, and real-time setting integration.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { usePlayerSettings } from '../../contexts/PlayerSettingsContext';
import { theme } from '../../constants/theme';

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
const radius = { sm: 6, md: 10, lg: 14, xl: 18, full: 9999 };

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VideoPlayerProps {
  source?: string;
  poster?: string;
  title?: string;
  onClose?: () => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'error' | 'ended';

export default function VideoPlayer({
  source,
  poster,
  title,
  onClose,
  onComplete,
}: VideoPlayerProps) {
  const { settings } = usePlayerSettings();
  
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(settings.defaultVolume);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(settings.defaultPlaybackSpeed);
  const [selectedQuality, setSelectedQuality] = useState(settings.defaultQuality);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const controlsOpacity = useSharedValue(1);
  const topGradientOpacity = useSharedValue(1);
  const bottomGradientOpacity = useSharedValue(1);
  
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    controlsOpacity.value = withTiming(1, { duration: 200 });
    topGradientOpacity.value = withTiming(1, { duration: 200 });
    bottomGradientOpacity.value = withTiming(1, { duration: 200 });
    
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    
    if (playbackState === 'playing') {
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
        controlsOpacity.value = withTiming(0, { duration: 300 });
        topGradientOpacity.value = withTiming(0, { duration: 300 });
        bottomGradientOpacity.value = withTiming(0, { duration: 300 });
      }, 3000);
    }
  }, [playbackState, controlsOpacity, topGradientOpacity, bottomGradientOpacity]);
  
  useEffect(() => {
    if (playbackState === 'playing') {
      progressInterval.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration && duration > 0) {
            setPlaybackState('ended');
            onComplete?.();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }
    
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [playbackState, duration, onComplete]);
  
  useEffect(() => {
    if (source) {
      setPlaybackState('loading');
      setTimeout(() => {
        setDuration(3600);
        setPlaybackState(settings.autoplay ? 'playing' : 'paused');
      }, 1500);
    }
  }, [source, settings.autoplay]);
  
  useEffect(() => {
    setShowControls(settings.showControls);
    setPlaybackSpeed(settings.defaultPlaybackSpeed);
    setSelectedQuality(settings.defaultQuality);
    setVolume(settings.defaultVolume);
  }, [settings]);
  
  const handlePlayPause = useCallback(() => {
    if (playbackState === 'playing') {
      setPlaybackState('paused');
    } else if (playbackState === 'paused' || playbackState === 'ended') {
      if (playbackState === 'ended') {
        setCurrentTime(0);
      }
      setPlaybackState('playing');
      showControlsTemporarily();
    }
  }, [playbackState, showControlsTemporarily]);
  
  const handleSeek = useCallback((time: number) => {
    setCurrentTime(Math.max(0, Math.min(time, duration)));
  }, [duration]);
  
  const handleSkip = useCallback((seconds: number) => {
    setCurrentTime(prev => Math.max(0, Math.min(prev + seconds, duration)));
  }, [duration]);
  
  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);
  
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);
  
  const handleRetry = useCallback(() => {
    setErrorMessage(null);
    setPlaybackState('loading');
    setTimeout(() => {
      setDuration(3600);
      setPlaybackState(settings.autoplay ? 'playing' : 'paused');
    }, 1500);
  }, [settings.autoplay]);
  
  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);
  
  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));
  
  const topGradientStyle = useAnimatedStyle(() => ({
    opacity: topGradientOpacity.value,
  }));
  
  const bottomGradientStyle = useAnimatedStyle(() => ({
    opacity: bottomGradientOpacity.value,
  }));
  
  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  const qualities = ['auto', '1080p', '720p', '480p', '360p'];
  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  
  return (
    <View style={[styles.container, isFullscreen && styles.containerFullscreen]}>
      <StatusBar hidden={isFullscreen} />
      
      <View style={styles.videoContainer}>
        {poster ? (
          <Image source={{ uri: poster }} style={styles.poster} contentFit="cover" />
        ) : (
          <View style={styles.videoPlaceholder} />
        )}
        
        <Animated.View style={[styles.topGradient, topGradientStyle]}>
          <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent']} style={styles.gradient} />
        </Animated.View>
        
        <Animated.View style={[styles.bottomGradient, bottomGradientStyle]}>
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.gradient} />
        </Animated.View>
      </View>
      
      {(playbackState === 'loading' || playbackState === 'buffering') && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.loadingText}>
            {playbackState === 'loading' ? 'Loading...' : 'Buffering...'}
          </Text>
        </View>
      )}
      
      {playbackState === 'error' && (
        <View style={styles.errorOverlay}>
          <MaterialIcons name="error-outline" size={48} color="#FFF" />
          <Text style={styles.errorText}>{errorMessage || 'Stream failed to load'}</Text>
          {settings.retryOnFailure && (
            <Pressable style={styles.retryButton} onPress={handleRetry}>
              <MaterialIcons name="replay" size={20} color="#FFF" />
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          )}
        </View>
      )}
      
      {showControls && playbackState !== 'error' && (
        <Animated.View style={[styles.controlsOverlay, controlsStyle]}>
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={handleClose}>
              <MaterialIcons name="arrow-back" size={24} color="#FFF" />
            </Pressable>
            {title && <Text style={styles.videoTitle}>{title}</Text>}
            <View style={styles.topRight}>
              {settings.enableQualitySelector && (
                <Pressable
                  style={styles.controlButton}
                  onPress={() => {
                    const currentIndex = qualities.indexOf(selectedQuality);
                    const nextIndex = (currentIndex + 1) % qualities.length;
                    setSelectedQuality(qualities[nextIndex] as typeof selectedQuality);
                  }}
                >
                  <MaterialIcons name="hd" size={20} color="#FFF" />
                  <Text style={styles.controlText}>{selectedQuality}</Text>
                </Pressable>
              )}
            </View>
          </View>
          
          <View style={styles.centerControls}>
            {settings.enableSkipButtons && (
              <Pressable style={styles.skipButton} onPress={() => handleSkip(-10)}>
                <MaterialIcons name="replay-10" size={36} color="#FFF" />
              </Pressable>
            )}
            
            <Pressable style={styles.playPauseButton} onPress={handlePlayPause}>
              <MaterialIcons 
                name={playbackState === 'playing' ? 'pause' : 'play-arrow'} 
                size={48} 
                color="#FFF" 
              />
            </Pressable>
            
            {settings.enableSkipButtons && (
              <Pressable style={styles.skipButton} onPress={() => handleSkip(10)}>
                <MaterialIcons name="forward-10" size={36} color="#FFF" />
              </Pressable>
            )}
          </View>
          
          <View style={styles.bottomBar}>
            <Pressable
              style={styles.progressContainer}
              onPress={(e) => {
                const { locationX } = e.nativeEvent;
                const newTime = (locationX / (SCREEN_WIDTH - 80)) * duration;
                handleSeek(newTime);
              }}
            >
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </Pressable>
            
            <View style={styles.bottomControls}>
              <Text style={styles.timeText}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Text>
              
              <View style={styles.rightControls}>
                {settings.enablePlaybackSpeedControl && (
                  <Pressable
                    style={styles.controlButton}
                    onPress={() => {
                      const currentIndex = speeds.indexOf(playbackSpeed);
                      const nextIndex = (currentIndex + 1) % speeds.length;
                      setPlaybackSpeed(speeds[nextIndex]);
                    }}
                  >
                    <Text style={styles.speedText}>{playbackSpeed}x</Text>
                  </Pressable>
                )}
                
                <Pressable style={styles.controlButton} onPress={handleToggleMute}>
                  <MaterialIcons 
                    name={isMuted ? 'volume-off' : volume > 0.5 ? 'volume-up' : 'volume-down'} 
                    size={20} 
                    color="#FFF" 
                  />
                </Pressable>
                
                {settings.enableFullscreen && (
                  <Pressable style={styles.controlButton} onPress={handleToggleFullscreen}>
                    <MaterialIcons 
                      name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'} 
                      size={24} 
                      color="#FFF" 
                    />
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </Animated.View>
      )}
      
      <TouchableOpacity style={styles.tapArea} activeOpacity={1} onPress={showControlsTemporarily} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * (9/16),
    backgroundColor: '#000',
    position: 'relative',
  },
  containerFullscreen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1000,
  },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  topGradient: {
    ...StyleSheet.absoluteFillObject,
    height: 100,
    zIndex: 1,
  },
  bottomGradient: {
    ...StyleSheet.absoluteFillObject,
    height: 150,
    bottom: 0,
    zIndex: 1,
  },
  gradient: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  loadingText: {
    color: '#FFF',
    marginTop: spacing.md,
    fontSize: 14,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  errorText: {
    color: '#FFF',
    marginTop: spacing.md,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: theme.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  retryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTitle: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.md,
  },
  topRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  controlText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  centerControls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  skipButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  progressContainer: {
    height: 40,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.primary,
    borderRadius: 2,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeText: {
    color: '#FFF',
    fontSize: 12,
  },
  rightControls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  speedText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tapArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
});