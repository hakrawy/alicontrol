import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import Hls, { Events } from 'hls.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../constants/theme';
import { useAuth } from '@/template';
import * as api from '../services/api';

type MediaKind = 'direct' | 'youtube' | 'web' | 'dash';
type PlayerSource = api.StreamSource;

interface HlsLevel {
  height: number;
  bitrate: number;
  index: number;
}

const RESUME_KEY_PREFIX = 'player-resume:';
const PREFERENCE_KEY_PREFIX = 'player-preference:';
const PROXY_KEY = 'player-proxy-url';

function getYouTubeVideoId(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.replace('www.', '');
    if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || null;
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (parsed.pathname === '/watch') return parsed.searchParams.get('v');
      const parts = parsed.pathname.split('/').filter(Boolean);
      const marker = parts[0];
      if (marker === 'embed' || marker === 'shorts' || marker === 'live') return parts[1] || null;
    }
    return null;
  } catch {
    return null;
  }
}

function getVimeoVideoId(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.replace('www.', '');
    if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null;
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parts.find((part) => /^\d+$/.test(part)) || null;
  } catch {
    return null;
  }
}

function isHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getMediaKind(rawUrl: string): MediaKind {
  if (getYouTubeVideoId(rawUrl)) return 'youtube';
  if (getVimeoVideoId(rawUrl)) return 'web';

  try {
    const parsed = new URL(rawUrl);
    const pathname = parsed.pathname.toLowerCase();

    if (pathname.endsWith('.mpd')) return 'dash';
    if (
      pathname.endsWith('.mp4') ||
      pathname.endsWith('.m3u8') ||
      pathname.endsWith('.webm') ||
      pathname.endsWith('.mov') ||
      pathname.endsWith('.m4v')
    ) {
      return 'direct';
    }
  } catch {
    return 'web';
  }

  return 'web';
}

function buildYouTubeEmbedUrl(rawUrl: string): string | null {
  const videoId = getYouTubeVideoId(rawUrl);
  if (!videoId) return null;

  const params = new URLSearchParams({
    autoplay: '1',
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    controls: '1',
    enablejsapi: '1',
    cc_load_policy: '1',
    iv_load_policy: '3',
    fs: '1',
  });

  if (typeof window !== 'undefined' && window.location?.origin) {
    params.set('origin', window.location.origin);
  }

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

function buildWebEmbedUrl(rawUrl: string): string {
  const youtubeEmbed = buildYouTubeEmbedUrl(rawUrl);
  if (youtubeEmbed) return youtubeEmbed;

  const vimeoId = getVimeoVideoId(rawUrl);
  if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;

  return rawUrl;
}

function parseSourcesParam(rawSources?: string | string[], rawUrl?: string | string[]): PlayerSource[] {
  const sourcePayload = Array.isArray(rawSources) ? rawSources[0] : rawSources;
  const fallbackUrl = (Array.isArray(rawUrl) ? rawUrl[0] : rawUrl) || '';

  if (sourcePayload) {
    try {
      const parsed = JSON.parse(sourcePayload);
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .filter((item) => item && typeof item === 'object' && typeof item.url === 'string')
          .map((item, index) => ({
            label:
              typeof item.label === 'string' && item.label.trim()
                ? item.label.trim()
                : `Server ${index + 1}`,
            url: item.url.trim(),
            addon: typeof item.addon === 'string' ? item.addon.trim() : undefined,
            addonId: typeof item.addonId === 'string' ? item.addonId.trim() : undefined,
            server: typeof item.server === 'string' ? item.server.trim() : undefined,
            quality: typeof item.quality === 'string' ? item.quality.trim() : undefined,
            language: typeof item.language === 'string' ? item.language.trim() : undefined,
            subtitle: typeof item.subtitle === 'string' ? item.subtitle.trim() : undefined,
            status: typeof item.status === 'string' ? item.status : undefined,
            lastCheckedAt: typeof item.lastCheckedAt === 'string' ? item.lastCheckedAt : undefined,
            streamType: typeof item.streamType === 'string' ? item.streamType : undefined,
            externalUrl: typeof item.externalUrl === 'string' ? item.externalUrl.trim() : undefined,
            headers: item.headers && typeof item.headers === 'object' ? item.headers : undefined,
            behaviorHints:
              item.behaviorHints && typeof item.behaviorHints === 'object'
                ? item.behaviorHints
                : null,
            proxyRequired: Boolean(item.proxyRequired),
            isWorking: typeof item.isWorking === 'boolean' ? item.isWorking : undefined,
            responseTimeMs: Number.isFinite(item.responseTimeMs) ? item.responseTimeMs : undefined,
            priority: Number.isFinite(item.priority) ? item.priority : undefined,
          }))
          .filter((item) => item.url);

        if (normalized.length > 0) return normalized;
      }
    } catch {
      // ignore bad JSON
    }
  }

  if (!fallbackUrl) return [];
  return [{ label: 'Server 1', url: fallbackUrl }];
}

function rankQuality(quality?: string) {
  const value = String(quality || '').toLowerCase();
  if (value.includes('4k') || value.includes('2160')) return 6;
  if (value.includes('1440')) return 5;
  if (value.includes('1080')) return 4;
  if (value.includes('720')) return 3;
  if (value.includes('480')) return 2;
  if (value.includes('360')) return 1;
  return 0;
}

function sortSources(sources: PlayerSource[]) {
  return [...sources].sort((a, b) => {
    const statusRank = (s: PlayerSource) =>
      s.status === 'working' || s.isWorking
        ? 3
        : s.status === 'unknown'
          ? 2
          : s.status === 'failing'
            ? 1
            : 0;

    const rA = Number.isFinite(a.responseTimeMs as number)
      ? (a.responseTimeMs as number)
      : Number.MAX_SAFE_INTEGER;
    const rB = Number.isFinite(b.responseTimeMs as number)
      ? (b.responseTimeMs as number)
      : Number.MAX_SAFE_INTEGER;

    return (
      ((b.priority ?? 0) - (a.priority ?? 0)) ||
      (statusRank(b) - statusRank(a)) ||
      (rankQuality(b.quality) - rankQuality(a.quality)) ||
      (rA - rB)
    );
  });
}

function formatPlaybackTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return 'LIVE';

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  return `${m}:${s.toString().padStart(2, '0')}`;
}

function applyProxy(url: string, proxyUrl: string | null): string {
  if (!proxyUrl) return url;

  try {
    const trimmed = proxyUrl.replace(/\/$/, '');
    return `${trimmed}/${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}

function SubtitleSheet({
  visible,
  subtitleTracks,
  activeTrackIndex,
  onSelect,
  onClose,
  onAddExternal,
}: {
  visible: boolean;
  subtitleTracks: { label: string; src: string; lang: string }[];
  activeTrackIndex: number | null;
  onSelect: (index: number | null) => void;
  onClose: () => void;
  onAddExternal: (url: string) => void;
}) {
  const [externalUrl, setExternalUrl] = useState('');
  const [showInput, setShowInput] = useState(false);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose} />
      <View style={modalStyles.sheet}>
        <View style={modalStyles.handle} />
        <Text style={modalStyles.sheetTitle}>الترجمة / Subtitles</Text>

        <Pressable
          style={[modalStyles.trackRow, activeTrackIndex === null && modalStyles.trackRowActive]}
          onPress={() => {
            onSelect(null);
            onClose();
          }}
        >
          <MaterialIcons
            name="subtitles-off"
            size={20}
            color={activeTrackIndex === null ? theme.primary : 'rgba(255,255,255,0.6)'}
          />
          <Text
            style={[
              modalStyles.trackLabel,
              activeTrackIndex === null && modalStyles.trackLabelActive,
            ]}
          >
            إيقاف الترجمة / Off
          </Text>
        </Pressable>

        {subtitleTracks.map((track, index) => (
          <Pressable
            key={`${track.src}-${index}`}
            style={[modalStyles.trackRow, activeTrackIndex === index && modalStyles.trackRowActive]}
            onPress={() => {
              onSelect(index);
              onClose();
            }}
          >
            <MaterialIcons
              name="subtitles"
              size={20}
              color={activeTrackIndex === index ? theme.primary : 'rgba(255,255,255,0.6)'}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  modalStyles.trackLabel,
                  activeTrackIndex === index && modalStyles.trackLabelActive,
                ]}
              >
                {track.label}
              </Text>
              <Text style={modalStyles.trackLang}>{track.lang}</Text>
            </View>
          </Pressable>
        ))}

        <Pressable style={modalStyles.addExtBtn} onPress={() => setShowInput((v) => !v)}>
          <MaterialIcons name="add" size={18} color={theme.primary} />
          <Text style={modalStyles.addExtText}>إضافة ترجمة خارجية (.srt/.vtt)</Text>
        </Pressable>

        {showInput && (
          <View style={modalStyles.inputRow}>
            <TextInput
              style={modalStyles.urlInput}
              placeholder="https://example.com/subtitle.vtt"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={externalUrl}
              onChangeText={setExternalUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <Pressable
              style={modalStyles.urlAddBtn}
              onPress={() => {
                if (!externalUrl.trim()) return;
                onAddExternal(externalUrl.trim());
                setExternalUrl('');
                setShowInput(false);
                onClose();
              }}
            >
              <Text style={modalStyles.urlAddBtnText}>إضافة</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

function ProxySheet({
  visible,
  currentProxy,
  onSave,
  onClose,
}: {
  visible: boolean;
  currentProxy: string;
  onSave: (url: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(currentProxy);

  useEffect(() => {
    setValue(currentProxy);
  }, [currentProxy]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose} />
      <View style={modalStyles.sheet}>
        <View style={modalStyles.handle} />
        <Text style={modalStyles.sheetTitle}>إعداد البروكسي / Proxy</Text>
        <Text style={modalStyles.sheetSubtitle}>
          أدخل عنوان البروكسي لتشغيل المصادر المحجوبة. مثال:{'\n'}
          https://proxy.example.com/
        </Text>

        <TextInput
          style={modalStyles.urlInput}
          placeholder="https://proxy.example.com/"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={value}
          onChangeText={setValue}
          autoCapitalize="none"
          keyboardType="url"
        />

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <Pressable
            style={[modalStyles.urlAddBtn, { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)' }]}
            onPress={() => {
              onSave('');
              onClose();
            }}
          >
            <Text style={[modalStyles.urlAddBtnText, { color: 'rgba(255,255,255,0.7)' }]}>
              إلغاء البروكسي
            </Text>
          </Pressable>

          <Pressable
            style={[modalStyles.urlAddBtn, { flex: 1 }]}
            onPress={() => {
              onSave(value.trim());
              onClose();
            }}
          >
            <Text style={modalStyles.urlAddBtnText}>حفظ</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function QualityBar({
  levels,
  currentLevel,
  onSelectLevel,
}: {
  levels: HlsLevel[];
  currentLevel: number;
  onSelectLevel: (index: number) => void;
}) {
  const options = [{ label: 'Auto', index: -1 }, ...levels.map((l) => ({ label: `${l.height}p`, index: l.index }))];

  return (
    <View style={styles.qualityBar}>
      {options.map((opt) => (
        <Pressable
          key={opt.index}
          style={[styles.qualityBtn, currentLevel === opt.index && styles.qualityBtnActive]}
          onPress={() => onSelectLevel(opt.index)}
        >
          <Text
            style={[
              styles.qualityBtnText,
              currentLevel === opt.index && styles.qualityBtnTextActive,
            ]}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function SourceSelector({
  sources,
  activeIndex,
  onSelect,
}: {
  sources: PlayerSource[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  if (sources.length <= 1) return null;

  return (
    <View style={styles.sourcesSheet}>
      <View style={styles.sourcesSheetHeader}>
        <Text style={styles.sourcesSheetEyebrow}>PLAYBACK SOURCES</Text>
        <Text style={styles.sourcesSheetTitle}>Servers</Text>
        <Text style={styles.sourcesSheetSubtitle}>
          Switch instantly if one source is slow or blocked.
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sourcesRow}>
        {sources.map((source, index) => (
          <Pressable
            key={`${source.label}-${index}`}
            style={[styles.sourceChip, activeIndex === index && styles.sourceChipActive]}
            onPress={() => onSelect(index)}
          >
            <Text style={[styles.sourceChipText, activeIndex === index && styles.sourceChipTextActive]}>
              {source.server || source.label}
            </Text>
            {!!(source.addon || source.quality) && (
              <Text style={[styles.sourceChipMeta, activeIndex === index && styles.sourceChipMetaActive]}>
                {[source.addon, source.quality].filter(Boolean).join(' • ')}
              </Text>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function SpeedMenu({
  playbackSpeed,
  onSelect,
}: {
  playbackSpeed: number;
  onSelect: (s: number) => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(150)} style={styles.speedMenu}>
      <Text style={styles.speedMenuTitle}>سرعة التشغيل</Text>
      {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
        <Pressable
          key={speed}
          style={[styles.speedOption, playbackSpeed === speed && styles.speedOptionActive]}
          onPress={() => onSelect(speed)}
        >
          <Text
            style={[
              styles.speedOptionText,
              playbackSpeed === speed && styles.speedOptionTextActive,
            ]}
          >
            {speed === 1 ? 'عادي (1x)' : `${speed}x`}
          </Text>
        </Pressable>
      ))}
    </Animated.View>
  );
}

function SettingsMenu({
  onSubtitle,
  onProxy,
  onSpeed,
  onSources,
  hasSubtitles,
  hasSources,
  subtitleActive,
  proxyActive,
}: {
  onSubtitle: () => void;
  onProxy: () => void;
  onSpeed: () => void;
  onSources: () => void;
  hasSubtitles: boolean;
  hasProxy: boolean;
  hasSources: boolean;
  subtitleActive: boolean;
  proxyActive: boolean;
}) {
  return (
    <Animated.View entering={FadeIn.duration(150)} style={styles.settingsMenu}>
      {hasSubtitles && (
        <Pressable style={styles.settingsRow} onPress={onSubtitle}>
          <MaterialIcons
            name="subtitles"
            size={18}
            color={subtitleActive ? theme.primary : 'rgba(255,255,255,0.8)'}
          />
          <Text style={[styles.settingsRowText, subtitleActive && { color: theme.primary }]}>
            الترجمة
          </Text>
        </Pressable>
      )}

      {hasSources && (
        <Pressable style={styles.settingsRow} onPress={onSources}>
          <MaterialIcons name="dns" size={18} color="rgba(255,255,255,0.8)" />
          <Text style={styles.settingsRowText}>مصادر التشغيل</Text>
        </Pressable>
      )}

      <Pressable style={styles.settingsRow} onPress={onSpeed}>
        <MaterialIcons name="speed" size={18} color="rgba(255,255,255,0.8)" />
        <Text style={styles.settingsRowText}>سرعة التشغيل</Text>
      </Pressable>

      <Pressable style={styles.settingsRow} onPress={onProxy}>
        <MaterialIcons
          name="security"
          size={18}
          color={proxyActive ? theme.primary : 'rgba(255,255,255,0.8)'}
        />
        <Text style={[styles.settingsRowText, proxyActive && { color: theme.primary }]}>
          البروكسي
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function WebDirectPlayer({
  url,
  title,
  sources,
  selectedSourceIndex,
  onSelectSource,
  onPlaybackFailure,
  subtitleUrl,
  proxyUrl,
  initialResumeTime,
  onProgress,
}: {
  url: string;
  title: string;
  sources: PlayerSource[];
  selectedSourceIndex: number;
  onSelectSource: (index: number) => void;
  onPlaybackFailure: (reason?: string) => void;
  subtitleUrl?: string;
  proxyUrl: string;
  initialResumeTime: number;
  onProgress?: (currentTime: number, duration: number) => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const [showSubtitleSheet, setShowSubtitleSheet] = useState(false);
  const [showProxySheet, setShowProxySheet] = useState(false);
  const [hlsLevels, setHlsLevels] = useState<HlsLevel[]>([]);
  const [hlsCurrentLevel, setHlsCurrentLevel] = useState(-1);
  const [externalSubtitles, setExternalSubtitles] = useState<{ label: string; src: string; lang: string }[]>([]);
  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState<number | null>(null);
  const [resumeReady, setResumeReady] = useState(false);

  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const anyMenuOpenRef = useRef(false);

  const activeSource = sources[selectedSourceIndex];
  const resolvedUrl = activeSource?.proxyRequired && proxyUrl ? applyProxy(url, proxyUrl) : url;

  const allSubtitleTracks = useMemo(() => {
    const base = subtitleUrl ? [{ label: 'افتراضي', src: subtitleUrl, lang: 'ar' }] : [];
    return [...base, ...externalSubtitles];
  }, [subtitleUrl, externalSubtitles]);

  const scheduleControlsHide = useCallback((delay = 3000) => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (!anyMenuOpenRef.current) setShowControls(false);
    }, delay);
  }, []);

  useEffect(() => {
    if (initialResumeTime > 5) {
      setResumeReady(true);
      return;
    }
    setResumeReady(true);
  }, [initialResumeTime]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedUrl || !resumeReady) return;

    setPlaybackError(null);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    let hls: Hls | null = null;

    if (Hls.isSupported() && resolvedUrl.includes('.m3u8')) {
      hls = new Hls({ debug: false, enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(resolvedUrl);
      hls.attachMedia(video);

      hls.on(Events.MANIFEST_PARSED, (_event, data: any) => {
        const levels: HlsLevel[] = data.levels.map((level: any, index: number) => ({
          height: level.height || 0,
          bitrate: level.bitrate || 0,
          index,
        }));
        setHlsLevels(levels);
        setHlsCurrentLevel(-1);
      });

      hls.on(Events.LEVEL_SWITCHED, (_event, data: any) => {
        setHlsCurrentLevel(data.level);
      });

      hls.on(Events.ERROR, (_event, data: any) => {
        if (data?.fatal) {
          setPlaybackError('فشل تحميل هذا البث.');
          onPlaybackFailure('fatal_hls_error');
        }
      });
    } else {
      video.src = resolvedUrl;
    }

    const onLoadedMetadata = () => {
      if (initialResumeTime > 5 && Number.isFinite(video.duration)) {
        video.currentTime = Math.min(initialResumeTime, Math.max((video.duration || 0) - 3, 0));
      }
    };

    const onTimeUpdate = () => {
      const nextCurrentTime = video.currentTime || 0;
      const nextDuration = Number.isFinite(video.duration) ? video.duration : 0;
      setCurrentTime(nextCurrentTime);
      setDuration(nextDuration);
      setIsPlaying(!video.paused);
      onProgress?.(nextCurrentTime, nextDuration);
    };

    const onError = () => {
      setPlaybackError('تعذّر تشغيل هذا المصدر.');
      onPlaybackFailure('html5_error');
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('error', onError);

    void video.play().catch(() => {
      setIsPlaying(false);
    });

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('error', onError);

      if (hls) {
        hls.destroy();
      } else {
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [resolvedUrl, resumeReady, initialResumeTime, onPlaybackFailure, onProgress]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    anyMenuOpenRef.current = showSettingsMenu || showSpeedMenu || showSourcesPanel;
  }, [showSettingsMenu, showSpeedMenu, showSourcesPanel]);

  const changeHlsLevel = useCallback((index: number) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = index;
    setHlsCurrentLevel(index);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <View style={styles.videoContainer}>
        <video
          ref={videoRef}
          style={styles.webFrame as any}
          playsInline
          controls={false}
          autoPlay
          muted={false}
          preload="auto"
        >
          {allSubtitleTracks.map((track, index) => (
            <track
              key={`${track.src}-${index}`}
              kind="subtitles"
              src={track.src}
              srcLang={track.lang}
              label={track.label}
              default={index === 0}
            />
          ))}
        </video>
      </View>

      {showControls && hlsLevels.length > 0 && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[styles.qualityBarWrap, { top: insets.top + 4 }]}
        >
          <QualityBar levels={hlsLevels} currentLevel={hlsCurrentLevel} onSelectLevel={changeHlsLevel} />
        </Animated.View>
      )}

      {showControls && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          pointerEvents="box-none"
          style={[styles.controlsOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom, zIndex: 10 }]}
        >
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={22} color="#FFF" />
            </Pressable>

            <View style={styles.titleWrap}>
              <Text style={styles.titleText} numberOfLines={1}>
                {title || 'جارٍ التشغيل'}
              </Text>
            </View>

            <Pressable
              style={[styles.topBarBtn, showSettingsMenu && styles.topBarBtnActive]}
              onPress={() => {
                setShowSettingsMenu((v) => !v);
                setShowSpeedMenu(false);
              }}
            >
              <MaterialIcons name="more-vert" size={22} color="#FFF" />
            </Pressable>

            <Pressable
              style={[styles.topBarBtn, showSourcesPanel && styles.topBarBtnActive]}
              onPress={() => setShowSourcesPanel((v) => !v)}
            >
              <MaterialIcons name="layers" size={22} color="#FFF" />
            </Pressable>
          </View>

          {showSettingsMenu && (
            <SettingsMenu
              onSubtitle={() => {
                setShowSubtitleSheet(true);
                setShowSettingsMenu(false);
              }}
              onProxy={() => {
                setShowProxySheet(true);
                setShowSettingsMenu(false);
              }}
              onSpeed={() => {
                setShowSpeedMenu(true);
                setShowSettingsMenu(false);
              }}
              onSources={() => {
                setShowSourcesPanel(true);
                setShowSettingsMenu(false);
              }}
              hasSubtitles={allSubtitleTracks.length > 0}
              hasProxy={true}
              hasSources={sources.length > 1}
              subtitleActive={activeSubtitleIndex !== null}
              proxyActive={Boolean(proxyUrl)}
            />
          )}

          {showSpeedMenu && (
            <SpeedMenu playbackSpeed={playbackSpeed} onSelect={(speed) => setPlaybackSpeed(speed)} />
          )}

          {showSourcesPanel && (
            <SourceSelector
              sources={sources}
              activeIndex={selectedSourceIndex}
              onSelect={(index) => {
                onSelectSource(index);
                setShowSourcesPanel(false);
              }}
            />
          )}

          {!!playbackError && <Text style={styles.errorText}>{playbackError}</Text>}

          <View style={styles.bottomBar}>
            <View style={styles.bottomControlRow}>
              <Text style={styles.timeText}>{formatPlaybackTime(currentTime)}</Text>
              <Text style={styles.timeSeparator}>/</Text>
              <Text style={styles.timeDuration}>{formatPlaybackTime(duration)}</Text>
            </View>
          </View>
        </Animated.View>
      )}

      <SubtitleSheet
        visible={showSubtitleSheet}
        subtitleTracks={allSubtitleTracks}
        activeTrackIndex={activeSubtitleIndex}
        onSelect={setActiveSubtitleIndex}
        onClose={() => setShowSubtitleSheet(false)}
        onAddExternal={(src) => {
          setExternalSubtitles((prev) => [...prev, { label: 'ترجمة خارجية', src, lang: 'ar' }]);
        }}
      />

      <ProxySheet
        visible={showProxySheet}
        currentProxy={proxyUrl}
        onSave={async (newProxy) => {
          try {
            await AsyncStorage.setItem(PROXY_KEY, newProxy);
          } catch {}
        }}
        onClose={() => setShowProxySheet(false)}
      />
    </View>
  );
}

function DirectVideoPlayer(props: {
  url: string;
  title: string;
  sources: PlayerSource[];
  selectedSourceIndex: number;
  onSelectSource: (index: number) => void;
  onPlaybackFailure: (reason?: string) => void;
  mediaKind: MediaKind;
  subtitleUrl?: string;
  initialResumeTime?: number;
  onProgress?: (currentTime: number, duration: number) => void;
  proxyUrl: string;
}) {
  if (Platform.OS === 'web') {
    return <WebDirectPlayer {...props} initialResumeTime={props.initialResumeTime ?? 0} />;
  }

  return <NativeDirectVideoPlayer {...props} />;
}
