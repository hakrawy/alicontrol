import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Dimensions, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth, useAlert } from '@/template';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { theme } from '../constants/theme';
import * as api from '../services/api';
import type { WatchRoom, RoomMessage, StreamSource } from '../services/api';
import { useAppContext } from '../contexts/AppContext';
import { useLocale } from '../contexts/LocaleContext';
import { startWatchRoomRealtime, type WatchRoomRealtimeStatus, type RoomPresenceMember, type RoomPlaybackEvent } from '../services/watchroomRealtime';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WatchRoomScreen() {
  const {
    contentId,
    contentType,
    contentTitle,
    contentPoster,
  } = useLocalSearchParams<{
    contentId?: string;
    contentType?: 'movie' | 'episode';
    contentTitle?: string;
    contentPoster?: string;
  }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { allMovies, isAdmin } = useAppContext();
  const { language, isRTL, direction } = useLocale();
  const [activeRooms, setActiveRooms] = useState<WatchRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<WatchRoom | null>(null);
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [realtimeStatus, setRealtimeStatus] = useState<WatchRoomRealtimeStatus>('idle');
  const [roomPresence, setRoomPresence] = useState<RoomPresenceMember[]>([]);
  const [roomRoles, setRoomRoles] = useState<api.RoomRole[]>([]);
  const [roomBans, setRoomBans] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [recentReactions, setRecentReactions] = useState<{ emoji: string; username: string; id: string }[]>([]);
  const chatScrollRef = useRef<ScrollView>(null);
  const realtimeRef = useRef<ReturnType<typeof startWatchRoomRealtime> | null>(null);
  const realtimeStatusRef = useRef<WatchRoomRealtimeStatus>('idle');
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomId = selectedRoom?.id;

  const copy = language === 'Arabic'
    ? {
        error: 'خطأ',
        joinFailed: 'تعذر الانضمام إلى الغرفة',
        deleteRoom: 'حذف الغرفة',
        deleteRoomConfirm: 'هل تريد حذف الغرفة "{name}" لجميع المشاركين؟',
        cancel: 'إلغاء',
        delete: 'حذف',
        deleted: 'تم الحذف',
        deletedDesc: 'تم إغلاق غرفة المشاهدة.',
        contentUnavailable: 'المحتوى غير متاح',
        contentUnavailableDesc: 'أضف فيلمًا واحدًا على الأقل قبل إنشاء غرفة مشاهدة.',
        createFailed: 'فشل إنشاء الغرفة',
        playbackUnavailable: 'التشغيل غير متاح',
        playbackUnavailableDesc: 'لا يوجد رابط بث صالح لهذه الغرفة حتى الآن.',
        playbackError: 'خطأ في التشغيل',
        host: 'المضيف',
        unknown: 'غير معروف',
        noMessages: 'لا توجد رسائل بعد. ابدأ المحادثة!',
        saySomething: 'اكتب رسالة...',
        create: 'إنشاء',
        createRoomTitle: 'إنشاء غرفة مشاهدة',
        selectedContent: 'المحتوى المحدد: {title}',
        fallbackContent: 'المحتوى المحدد: أول فيلم متاح',
        roomName: 'اسم الغرفة...',
        watchTogether: 'شاهدوا معًا',
        watchTogetherDesc: 'انضم إلى غرفة أو أنشئ واحدة للمشاهدة مع الأصدقاء',
        activeRooms: 'غرف نشطة',
        code: 'الرمز',
        public: 'عامة',
        private: 'خاصة',
        join: 'انضمام',
        noRooms: 'لا توجد غرف نشطة',
        noRoomsDesc: 'أنشئ غرفة جديدة لبدء المشاهدة الجماعية!',
        room: 'الغرفة',
        updateRoomContent: 'تحديث محتوى الغرفة',
        roomUpdated: 'تم تحديث الغرفة',
        roomUpdatedDesc: 'تم ربط الغرفة بالمحتوى المحدد الجديد.',
      }
    : {
        error: 'Error',
        joinFailed: 'Failed to join room',
        deleteRoom: 'Delete room',
        deleteRoomConfirm: 'Delete "{name}" for all participants?',
        cancel: 'Cancel',
        delete: 'Delete',
        deleted: 'Deleted',
        deletedDesc: 'The watch room has been closed.',
        contentUnavailable: 'Content unavailable',
        contentUnavailableDesc: 'Add at least one movie before creating a watch room.',
        createFailed: 'Failed to create room',
        playbackUnavailable: 'Playback unavailable',
        playbackUnavailableDesc: 'No playable stream URL is configured for this room yet.',
        playbackError: 'Playback error',
        host: 'Host',
        unknown: 'Unknown',
        noMessages: 'No messages yet. Start the conversation!',
        saySomething: 'Say something...',
        create: 'Create',
        createRoomTitle: 'Create Watch Room',
        selectedContent: 'Selected content: {title}',
        fallbackContent: 'Selected content: first available movie',
        roomName: 'Room name...',
        watchTogether: 'Watch Together',
        watchTogetherDesc: 'Join a room or create one to watch with friends',
        activeRooms: 'ACTIVE ROOMS',
        code: 'Code',
        public: 'Public',
        private: 'Private',
        join: 'Join',
        noRooms: 'No active rooms',
        noRoomsDesc: 'Create one to start watching together!',
        room: 'Room',
        updateRoomContent: 'Update room content',
        roomUpdated: 'Room updated',
        roomUpdatedDesc: 'The room now points to the latest selected content.',
      };

  const realtimeStatusLabel: Record<WatchRoomRealtimeStatus, string> = {
    idle: 'Idle',
    connecting: 'Connecting',
    connected: 'Live',
    reconnecting: 'Reconnecting',
    error: 'Fallback',
    disconnected: 'Offline',
  };

  const getPlayerParams = (
    sources: StreamSource[],
    fallbackUrl: string,
    title: string,
    subtitleUrl?: string,
    viewer?: { viewerContentId: string; viewerContentType: api.ViewerContentType; roomId?: string }
  ) => ({
    title,
    url: fallbackUrl,
    sources: JSON.stringify(sources),
    subtitleUrl: subtitleUrl || '',
    viewerContentId: viewer?.viewerContentId || '',
    viewerContentType: viewer?.viewerContentType || ('movie' as const),
    roomId: viewer?.roomId || '',
  });

  const selectedContent = contentId && contentType && contentTitle && contentPoster
    ? { id: contentId, type: contentType, title: contentTitle, poster: contentPoster }
    : null;

  const loadRooms = useCallback(async () => {
    try {
      const rooms = await api.fetchActiveRooms();
      setActiveRooms(rooms);
    } catch {}
    setLoading(false);
  }, []);

  const mergeMessages = useCallback((nextMessage: RoomMessage) => {
    setMessages((prev) => {
      const map = new Map(prev.map((message) => [message.id, message] as const));
      map.set(nextMessage.id, nextMessage);
      return Array.from(map.values()).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });
  }, []);

  const applyRoomContentPayload = useCallback((payload?: Record<string, any> | null) => {
    if (!payload || typeof payload !== 'object') return;
    setSelectedRoom((current) => (current ? {
      ...current,
      content_id: String(payload.content_id || current.content_id),
      content_type: (payload.content_type as WatchRoom['content_type']) || current.content_type,
      content_title: String(payload.content_title || current.content_title),
      content_poster: String(payload.content_poster || current.content_poster),
      stream_url: String(payload.stream_url || current.stream_url || ''),
      stream_sources: Array.isArray(payload.stream_sources) ? payload.stream_sources : current.stream_sources,
      subtitle_url: String(payload.subtitle_url || current.subtitle_url || ''),
      source_label: String(payload.source_label || current.source_label || ''),
    } : current));
  }, []);

  const currentUserRole = useMemo(() => {
    if (!selectedRoom || !user?.id) return 'member';
    if (isAdmin || selectedRoom.host_id === user.id) return 'host';
    const explicitRole = roomRoles.find((role) => role.user_id === user.id)?.role;
    const presenceRole = roomPresence.find((member) => member.userId === user.id)?.role;
    return explicitRole || presenceRole || 'member';
  }, [isAdmin, roomPresence, roomRoles, selectedRoom, user?.id]);

  const canModerateRoom = currentUserRole === 'host' || currentUserRole === 'co-host' || currentUserRole === 'moderator' || isAdmin;
  const canChangeContent = currentUserRole === 'host' || currentUserRole === 'co-host' || isAdmin;

  useEffect(() => {
    if (!selectedRoom || !user?.id) return;

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (!chatMessage.trim()) {
      void realtimeRef.current?.sendControlEvent({
        id: `typing_off_${Date.now()}`,
        room_id: selectedRoom.id,
        actor_id: user.id,
        event_type: 'typing',
        media_id: null,
        media_type: null,
        position_ms: 0,
        playback_rate: 1,
        payload: { isTyping: false },
        sequence_no: 0,
        server_ts: new Date().toISOString(),
        client_ts: new Date().toISOString(),
      });
      return;
    }

    void realtimeRef.current?.sendControlEvent({
      id: `typing_on_${Date.now()}`,
      room_id: selectedRoom.id,
      actor_id: user.id,
      event_type: 'typing',
      media_id: null,
      media_type: null,
      position_ms: 0,
      playback_rate: 1,
      payload: { isTyping: true, username: user.username || user.email || 'User' },
      sequence_no: 0,
      server_ts: new Date().toISOString(),
      client_ts: new Date().toISOString(),
    });

    typingTimerRef.current = setTimeout(() => {
      void realtimeRef.current?.sendControlEvent({
        id: `typing_stop_${Date.now()}`,
        room_id: selectedRoom.id,
        actor_id: user.id,
        event_type: 'typing',
        media_id: null,
        media_type: null,
        position_ms: 0,
        playback_rate: 1,
        payload: { isTyping: false },
        sequence_no: 0,
        server_ts: new Date().toISOString(),
        client_ts: new Date().toISOString(),
      });
    }, 1200);

    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [chatMessage, selectedRoom, user?.id, user?.email, user?.username]);

  useEffect(() => {
    realtimeStatusRef.current = realtimeStatus;
  }, [realtimeStatus]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  useEffect(() => {
    if (realtimeRef.current) {
      void realtimeRef.current.cleanup().catch(() => undefined);
      realtimeRef.current = null;
    }

    if (!joinedRoom || !roomId || !user?.id) {
      setRealtimeStatus('idle');
      setRoomPresence([]);
      return;
    }

    let cancelled = false;
    const loadInitialMessages = async () => {
      try {
        const msgs = await api.fetchRoomMessages(roomId);
        if (!cancelled) {
          setMessages(msgs);
        }
      } catch {
        if (!cancelled) {
          setMessages([]);
        }
      }
    };

    void loadInitialMessages();
    void api.fetchRoomRoles(roomId).then((roles) => {
      if (!cancelled) setRoomRoles(roles);
    }).catch(() => undefined);
    void api.fetchRoomPresence(roomId).then((presence) => {
      if (!cancelled) {
        setRoomPresence(
          presence.map((entry) => ({
            userId: entry.user_id,
            username: entry.user?.username || 'User',
            avatar: entry.user?.avatar || null,
            role: entry.role,
            joinedAt: entry.joined_at,
            lastSeenAt: entry.last_seen_at,
          }))
        );
      }
    }).catch(() => undefined);
    void api.fetchRoomBans(roomId).then((bans) => {
      if (!cancelled) setRoomBans(bans);
    }).catch(() => undefined);
    void api.fetchRoomEvents(roomId).then((events) => {
      const lastContentChange = [...events].reverse().find((event) => event.event_type === 'content_change');
      if (!lastContentChange || !lastContentChange.payload || typeof lastContentChange.payload !== 'object' || cancelled) return;
      setSelectedRoom((current) => (current ? {
        ...current,
        content_id: String(lastContentChange.payload.content_id || current.content_id),
        content_type: (lastContentChange.payload.content_type as WatchRoom['content_type']) || current.content_type,
        content_title: String(lastContentChange.payload.content_title || current.content_title),
        content_poster: String(lastContentChange.payload.content_poster || current.content_poster),
        stream_url: String(lastContentChange.payload.stream_url || current.stream_url || ''),
        stream_sources: Array.isArray(lastContentChange.payload.stream_sources) ? lastContentChange.payload.stream_sources : current.stream_sources,
        subtitle_url: String(lastContentChange.payload.subtitle_url || current.subtitle_url || ''),
        source_label: String(lastContentChange.payload.source_label || current.source_label || ''),
      } : current));
    }).catch(() => undefined);
    const realtime = startWatchRoomRealtime({
      roomId,
      userId: user.id,
      username: user.username || user.email || 'User',
      avatar: (user as any)?.avatar || null,
      onStatus: setRealtimeStatus,
      onMessage: (message) => mergeMessages(message),
      onRoomUpdate: (room) => {
        setSelectedRoom((current) => (current?.id === room.id ? { ...current, ...room } : current));
      },
      onPresence: setRoomPresence,
      onPlaybackEvent: (event) => {
        if (event.event_type === 'content_change') {
          applyRoomContentPayload(event.payload);
        }
        if (event.event_type === 'join' || event.event_type === 'leave') {
          void api.fetchRoomPresence(roomId).then((presence) => {
            if (!cancelled) {
              setRoomPresence(
                presence.map((entry) => ({
                  userId: entry.user_id,
                  username: entry.user?.username || 'User',
                  avatar: entry.user?.avatar || null,
                  role: entry.role,
                  joinedAt: entry.joined_at,
                  lastSeenAt: entry.last_seen_at,
                }))
              );
            }
          }).catch(() => undefined);
        }
        if (event.event_type === 'reaction') {
          const emoji = String(event.payload?.emoji || '🎉');
          const username = String(event.payload?.username || 'User');
          const reactionId = `${event.id}_${Date.now()}`;
          setRecentReactions((current) => [{ emoji, username, id: reactionId }, ...current].slice(0, 6));
          setTimeout(() => {
            setRecentReactions((current) => current.filter((item) => item.id !== reactionId));
          }, 2200);
        }
      },
      onControlEvent: (event) => {
        if (event.event_type === 'content_change') {
          applyRoomContentPayload(event.payload);
        }
        if (event.event_type === 'typing') {
          const username = String(event.payload?.username || 'User');
          const isTyping = Boolean(event.payload?.isTyping);
          setTypingUsers((current) => {
            const next = new Set(current);
            if (isTyping) next.add(username);
            else next.delete(username);
            return Array.from(next).slice(0, 4);
          });
        }
        if (event.event_type === 'reaction') {
          const emoji = String(event.payload?.emoji || '🎉');
          const username = String(event.payload?.username || 'User');
          const reactionId = `${event.id}_${Date.now()}`;
          setRecentReactions((current) => [{ emoji, username, id: reactionId }, ...current].slice(0, 6));
          setTimeout(() => {
            setRecentReactions((current) => current.filter((item) => item.id !== reactionId));
          }, 2200);
        }
      },
    });

    realtimeRef.current = realtime;

    const fallbackInterval = setInterval(() => {
      if (realtimeStatusRef.current !== 'connected') {
        void api.fetchRoomMessages(roomId).then((msgs) => {
          if (!cancelled) {
            setMessages(msgs);
          }
        }).catch(() => undefined);
      }
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(fallbackInterval);
      void realtime.cleanup().catch(() => undefined);
      if (realtimeRef.current === realtime) {
        realtimeRef.current = null;
      }
    };
  }, [joinedRoom, roomId, user, mergeMessages, applyRoomContentPayload]);

  const handleJoinRoom = async (room: WatchRoom) => {
    if (!user?.id) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const activeBan = roomBans.find((ban) => ban.room_id === room.id && ban.user_id === user.id);
      if (activeBan) {
        showAlert(copy.error, 'You are banned from this room.');
        return;
      }
      await api.joinWatchRoom(room.id, user.id);
      setSelectedRoom(room);
      setJoinedRoom(true);
    } catch (err: any) {
      showAlert(copy.error, err.message || copy.joinFailed);
    }
  };

  const handleLeaveRoom = async () => {
    if (!user?.id || !selectedRoom) return;
    try { await api.leaveWatchRoom(selectedRoom.id, user.id); } catch {}
    if (realtimeRef.current) {
      await realtimeRef.current.cleanup().catch(() => undefined);
      realtimeRef.current = null;
    }
    setJoinedRoom(false);
    setSelectedRoom(null);
    setMessages([]);
    setRoomPresence([]);
    setRoomRoles([]);
    setRoomBans([]);
    setTypingUsers([]);
    setRecentReactions([]);
    setRealtimeStatus('idle');
    loadRooms();
  };

  const handleDeleteRoom = async (room: WatchRoom) => {
    showAlert(copy.deleteRoom, copy.deleteRoomConfirm.replace('{name}', room.name), [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.delete,
        style: 'destructive',
        onPress: async () => {
            try {
              await api.closeWatchRoom(room.id);
              if (selectedRoom?.id === room.id) {
                setJoinedRoom(false);
                setSelectedRoom(null);
                setMessages([]);
                setRoomPresence([]);
                setRoomRoles([]);
                setRoomBans([]);
                setTypingUsers([]);
                setRecentReactions([]);
                setRealtimeStatus('idle');
                if (realtimeRef.current) {
                  await realtimeRef.current.cleanup().catch(() => undefined);
                  realtimeRef.current = null;
                }
              }
              await loadRooms();
              showAlert(copy.deleted, copy.deletedDesc);
            } catch (err: any) {
            showAlert(copy.error, err.message || copy.error);
          }
        },
      },
    ]);
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !user?.id || !selectedRoom) return;
    Haptics.selectionAsync();
    try {
      const msg = await api.sendRoomMessage(selectedRoom.id, user.id, chatMessage.trim());
      mergeMessages(msg);
      setChatMessage('');
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {}
  };

  const handleCreateRoom = async () => {
    if (!user?.id || !roomName.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const fallbackMovie = allMovies[0];
      const roomContent = selectedContent || (
        fallbackMovie ? {
          id: fallbackMovie.id,
          type: 'movie' as const,
          title: fallbackMovie.title,
          poster: fallbackMovie.poster,
        } : null
      );

      if (!roomContent) {
        showAlert(copy.contentUnavailable, copy.contentUnavailableDesc);
        return;
      }

      const playback = await api.resolvePlayableMediaForContent({
        contentType: roomContent.type === 'movie' ? 'movie' : 'episode',
        contentId: roomContent.id,
      });

      if (!playback.url) {
        showAlert(copy.playbackUnavailable, copy.playbackUnavailableDesc);
        return;
      }

      const room = await api.createWatchRoom({
        name: roomName.trim(),
        host_id: user.id,
        content_id: roomContent.id,
        content_type: roomContent.type,
        content_title: roomContent.title,
        content_poster: roomContent.poster,
        privacy: 'public',
        max_participants: 10,
        stream_url: playback.url,
        stream_sources: playback.sources,
        subtitle_url: playback.subtitleUrl,
        source_label: playback.sourceLabel,
      });
      setShowCreate(false);
      setRoomName('');
      setSelectedRoom(room);
      setJoinedRoom(true);
    } catch (err: any) {
      showAlert(copy.error, err.message || copy.createFailed);
    }
  };

  const handlePlayRoomContent = async () => {
    if (!selectedRoom) return;
    try {
      let url = selectedRoom.stream_url || '';
      let sources: StreamSource[] = selectedRoom.stream_sources || [];
      let subtitleUrl = selectedRoom.subtitle_url || '';
      let viewerContentId = selectedRoom.content_id;
      let viewerContentType: api.ViewerContentType =
        selectedRoom.content_type === 'channel' ? 'channel' : selectedRoom.content_type === 'episode' ? 'series' : 'movie';

      if (!url) {
        const playback = await api.resolvePlayableMediaForContent({
          contentType: selectedRoom.content_type,
          contentId: selectedRoom.content_id,
        });
        url = playback.url;
        sources = playback.sources;
        subtitleUrl = playback.subtitleUrl;
        viewerContentId = playback.viewerContentId;
        viewerContentType = playback.viewerContentType;

        if (selectedRoom.host_id === user?.id || isAdmin) {
          const refreshedRoom = await api.updateWatchRoomMedia(selectedRoom.id, {
            stream_url: playback.url,
            stream_sources: playback.sources,
            subtitle_url: playback.subtitleUrl,
            source_label: playback.sourceLabel,
          });
          setSelectedRoom(refreshedRoom);
        }
      }

      if (!url) {
        showAlert(copy.playbackUnavailable, copy.playbackUnavailableDesc);
        return;
      }

      Haptics.selectionAsync();
      router.push({
        pathname: '/player',
        params: {
          ...getPlayerParams(sources, url, selectedRoom.content_title, subtitleUrl, {
            viewerContentId,
            viewerContentType,
            roomId: selectedRoom.id,
          }),
        },
      });
    } catch (err: any) {
      showAlert(copy.playbackError, err.message || copy.playbackError);
    }
  };

  const handleApplySelectedContentToRoom = async () => {
    if (!selectedRoom || !selectedContent) return;
    try {
      const playback = await api.resolvePlayableMediaForContent({
        contentType: selectedContent.type === 'movie' ? 'movie' : 'episode',
        contentId: selectedContent.id,
      });
      const updatedRoom = await api.updateWatchRoomMedia(selectedRoom.id, {
        content_id: selectedContent.id,
        content_type: selectedContent.type === 'movie' ? 'movie' : 'episode',
        content_title: selectedContent.title,
        content_poster: selectedContent.poster,
        stream_url: playback.url,
        stream_sources: playback.sources,
        subtitle_url: playback.subtitleUrl,
        source_label: playback.sourceLabel,
      });
      setSelectedRoom(updatedRoom);
      await api.appendRoomEvent({
        room_id: selectedRoom.id,
        actor_id: user?.id || selectedRoom.host_id,
        event_type: 'content_change',
        media_id: selectedContent.id,
        media_type: selectedContent.type === 'movie' ? 'movie' : 'episode',
        position_ms: 0,
        playback_rate: 1,
        payload: {
          content_id: selectedContent.id,
          content_type: selectedContent.type,
          content_title: selectedContent.title,
          content_poster: selectedContent.poster,
          stream_url: playback.url,
          stream_sources: playback.sources,
          subtitle_url: playback.subtitleUrl,
          source_label: playback.sourceLabel,
        },
        idempotency_key: `content_change:${selectedRoom.id}:${selectedContent.id}:${Date.now()}`,
      }).catch(() => null);
      const controlEvent: RoomPlaybackEvent = {
        id: `event_${Date.now()}`,
        room_id: selectedRoom.id,
        actor_id: user?.id || selectedRoom.host_id,
        event_type: 'content_change',
        media_id: selectedContent.id,
        media_type: selectedContent.type === 'movie' ? 'movie' : 'episode',
        position_ms: 0,
        playback_rate: 1,
        payload: {
          content_id: selectedContent.id,
          content_type: selectedContent.type,
          content_title: selectedContent.title,
          content_poster: selectedContent.poster,
          stream_url: playback.url,
          stream_sources: playback.sources,
          subtitle_url: playback.subtitleUrl,
          source_label: playback.sourceLabel,
        },
        sequence_no: 0,
        server_ts: new Date().toISOString(),
        client_ts: new Date().toISOString(),
      };
      await realtimeRef.current?.sendControlEvent(controlEvent);
      showAlert(copy.roomUpdated, copy.roomUpdatedDesc);
    } catch (err: any) {
      showAlert(copy.error, err.message || copy.playbackError);
    }
  };

  if (joinedRoom && selectedRoom) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, direction }]}>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[styles.roomHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Pressable onPress={handleLeaveRoom}><MaterialIcons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color="#FFF" /></Pressable>
              <View style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
                <Text style={styles.roomHeaderTitle} numberOfLines={1}>{selectedRoom.name}</Text>
                <View style={[styles.roomHeaderMeta, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={styles.roomLiveDot} />
                  <Text style={styles.roomHeaderSub}>
                    {copy.room}: {selectedRoom.room_code} • {roomPresence.length} online • {realtimeStatusLabel[realtimeStatus]}
                  </Text>
                </View>
              </View>
              {(isAdmin || selectedRoom.host_id === user?.id) ? (
                <Pressable style={styles.deleteRoomBtn} onPress={() => handleDeleteRoom(selectedRoom)}>
                  <MaterialIcons name="delete-outline" size={20} color="#FFF" />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.videoArea}>
              <Image source={{ uri: selectedRoom.content_poster }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
              <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />
              <View style={styles.videoControls}>
                <Pressable style={styles.videoBigPlayBtn} onPress={handlePlayRoomContent}>
                  <MaterialIcons name="play-arrow" size={44} color="#FFF" />
                </Pressable>
              </View>
              <View style={styles.hostBadge}>
                <MaterialIcons name="admin-panel-settings" size={14} color={theme.accent} />
                <Text style={styles.hostBadgeText}>{copy.host}: {selectedRoom.host?.username || copy.unknown}</Text>
              </View>
              <View style={[styles.roleBadge, canModerateRoom ? styles.roleBadgePower : styles.roleBadgeMember]}>
                <MaterialIcons name={canModerateRoom ? 'verified-user' : 'person'} size={12} color="#FFF" />
                <Text style={styles.roleBadgeText}>
                  {currentUserRole === 'host' ? 'Host' : currentUserRole === 'co-host' ? 'Co-host' : currentUserRole === 'moderator' ? 'Moderator' : 'Member'}
                </Text>
              </View>
              {(selectedContent && canChangeContent && selectedContent.id !== selectedRoom.content_id) ? (
                <Pressable style={styles.updateRoomContentBtn} onPress={handleApplySelectedContentToRoom}>
                  <MaterialIcons name="swap-horiz" size={16} color="#FFF" />
                  <Text style={styles.updateRoomContentText}>{copy.updateRoomContent}</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.reactionsRow}>
              {['👏', '😂', '🔥', '❤️', '😮', '🎉'].map((emoji) => (
                <Pressable
                  key={emoji}
                  style={styles.reactionBtn}
                  onPress={async () => {
                    Haptics.selectionAsync();
                    if (!selectedRoom || !user?.id) return;
                    setRecentReactions((current) => [{ emoji, username: user.username || user.email || 'User', id: `${emoji}_${Date.now()}` }, ...current].slice(0, 6));
                    try {
                      await realtimeRef.current?.sendControlEvent({
                        id: `reaction_${Date.now()}`,
                        room_id: selectedRoom.id,
                        actor_id: user.id,
                        event_type: 'reaction',
                        media_id: null,
                        media_type: null,
                        position_ms: 0,
                        playback_rate: 1,
                        payload: { emoji, username: user.username || user.email || 'User' },
                        sequence_no: 0,
                        server_ts: new Date().toISOString(),
                        client_ts: new Date().toISOString(),
                      });
                    } catch {}
                  }}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </Pressable>
              ))}
            </View>

            {typingUsers.length > 0 ? (
              <View style={styles.typingBar}>
                <MaterialIcons name="keyboard" size={14} color={theme.textSecondary} />
                <Text style={styles.typingText}>
                  {typingUsers.slice(0, 2).join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...
                </Text>
              </View>
            ) : null}

            {recentReactions.length > 0 ? (
              <View style={styles.recentReactionBar}>
                {recentReactions.map((reaction) => (
                  <View key={reaction.id} style={styles.recentReactionPill}>
                    <Text style={styles.recentReactionEmoji}>{reaction.emoji}</Text>
                    <Text style={styles.recentReactionText}>{reaction.username}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.chatContainer}>
              <ScrollView ref={chatScrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
                {messages.map(msg => (
                  <View key={msg.id} style={[styles.chatMsg, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={styles.chatAvatarFallback}>
                      <Text style={styles.chatAvatarText}>{(msg.user?.username?.[0] || 'U').toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={[styles.chatNameRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={styles.chatName}>{msg.user?.username || 'User'}</Text>
                        <Text style={styles.chatTime}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                      </View>
                      <Text style={[styles.chatText, { textAlign: isRTL ? 'right' : 'left' }]}>{msg.message}</Text>
                    </View>
                  </View>
                ))}
                {messages.length === 0 ? <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 40, fontSize: 14 }}>{copy.noMessages}</Text> : null}
              </ScrollView>
              <View style={[styles.chatInputRow, { paddingBottom: insets.bottom + 8, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TextInput style={styles.chatInput} placeholder={copy.saySomething} placeholderTextColor={theme.textMuted} value={chatMessage} onChangeText={setChatMessage} returnKeyType="send" onSubmitEditing={handleSendMessage} textAlign={isRTL ? 'right' : 'left'} />
                <Pressable style={styles.chatSendBtn} onPress={handleSendMessage}><MaterialIcons name="send" size={20} color="#FFF" /></Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background, direction }]}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={[styles.listHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Pressable onPress={() => router.back()}><MaterialIcons name="close" size={28} color="#FFF" /></Pressable>
          <Text style={styles.listTitle}>{copy.watchTogether}</Text>
          <Pressable style={[styles.createRoomBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => setShowCreate(true)}>
            <MaterialIcons name="add" size={20} color="#FFF" /><Text style={styles.createRoomText}>{copy.create}</Text>
          </Pressable>
        </View>

        {showCreate ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.createCard}>
            <Text style={styles.createTitle}>{copy.createRoomTitle}</Text>
            <Text style={styles.selectedContentText}>
              {selectedContent ? copy.selectedContent.replace('{title}', selectedContent.title) : copy.fallbackContent}
            </Text>
            <TextInput style={styles.createInput} placeholder={copy.roomName} placeholderTextColor={theme.textMuted} value={roomName} onChangeText={setRoomName} textAlign={isRTL ? 'right' : 'left'} />
            <View style={[styles.createActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Pressable style={styles.createCancelBtn} onPress={() => setShowCreate(false)}><Text style={styles.createCancelText}>{copy.cancel}</Text></Pressable>
              <Pressable style={styles.createSubmitBtn} onPress={handleCreateRoom}><Text style={styles.createSubmitText}>{copy.createRoomTitle}</Text></Pressable>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeIn.duration(400)}>
          <Image source={require('../assets/images/watchroom-hero.jpg')} style={styles.heroImage} contentFit="cover" transition={300} />
          <LinearGradient colors={['transparent', theme.background]} style={[StyleSheet.absoluteFillObject, { top: 80 }]} />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>{copy.watchTogether}</Text>
            <Text style={styles.heroSubtitle}>{copy.watchTogetherDesc}</Text>
          </View>
        </Animated.View>

        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16, gap: 12 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>{activeRooms.length} {copy.activeRooms}</Text>
            {activeRooms.map((room, index) => (
              <Animated.View key={room.id} entering={FadeInDown.delay(index * 80).duration(350)}>
                <Pressable style={[styles.roomListCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => handleJoinRoom(room)}>
                  <Image source={{ uri: room.content_poster }} style={styles.roomListPoster} contentFit="cover" transition={200} />
                  <View style={styles.roomListInfo}>
                    <Text style={styles.roomListName} numberOfLines={1}>{room.name}</Text>
                    <Text style={styles.roomListContent} numberOfLines={1}>{room.content_title}</Text>
                    <Text style={styles.roomListCode}>{copy.code}: {room.room_code}</Text>
                    <View style={[styles.roomListBottom, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.roomListParticipants, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <MaterialIcons name="people" size={14} color={theme.primary} />
                        <Text style={styles.roomListParticipantText}>{room.member_count || 0}/{room.max_participants}</Text>
                      </View>
                      <View style={[styles.roomPrivacyBadge, room.privacy === 'public' ? styles.privacyPublic : styles.privacyPrivate, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <MaterialIcons name={room.privacy === 'public' ? 'public' : 'lock'} size={12} color={room.privacy === 'public' ? theme.success : theme.warning} />
                        <Text style={{ fontSize: 10, fontWeight: '600', color: room.privacy === 'public' ? theme.success : theme.warning }}>{room.privacy === 'public' ? copy.public : copy.private}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.roomListActions}>
                    {(isAdmin || room.host_id === user?.id) ? (
                      <Pressable style={styles.inlineDeleteBtn} onPress={() => handleDeleteRoom(room)}>
                        <MaterialIcons name="delete-outline" size={18} color={theme.error} />
                      </Pressable>
                    ) : null}
                    <View style={styles.joinBtn}><Text style={styles.joinBtnText}>{copy.join}</Text></View>
                  </View>
                </Pressable>
              </Animated.View>
            ))}
            {activeRooms.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 40, gap: 12 }}>
                <MaterialIcons name="groups" size={56} color={theme.textMuted} />
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFF' }}>{copy.noRooms}</Text>
                <Text style={{ fontSize: 14, color: theme.textSecondary }}>{copy.noRoomsDesc}</Text>
              </View>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listHeader: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  listTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  createRoomBtn: { alignItems: 'center', gap: 4, backgroundColor: theme.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  createRoomText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  heroImage: { width: SCREEN_WIDTH, height: 160 },
  heroOverlay: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  heroSubtitle: { fontSize: 14, color: theme.textSecondary },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: theme.textMuted, letterSpacing: 1, marginTop: 8 },
  createCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: theme.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: theme.border },
  createTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 16 },
  selectedContentText: { fontSize: 13, color: theme.textSecondary, marginBottom: 12 },
  createInput: { height: 48, backgroundColor: theme.surfaceLight, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, color: '#FFF', borderWidth: 1, borderColor: theme.border, marginBottom: 16 },
  createActions: { gap: 12 },
  createCancelBtn: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  createCancelText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
  createSubmitBtn: { flex: 1, height: 44, borderRadius: 10, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  createSubmitText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  roomListCard: { alignItems: 'center', backgroundColor: theme.surface, borderRadius: 14, padding: 12, gap: 12, borderWidth: 1, borderColor: theme.border },
  roomListPoster: { width: 70, height: 100, borderRadius: 8 },
  roomListInfo: { flex: 1, gap: 4 },
  roomListName: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  roomListContent: { fontSize: 12, color: theme.textSecondary },
  roomListCode: { fontSize: 11, fontWeight: '600', color: theme.primary },
  roomListBottom: { alignItems: 'center', gap: 10, marginTop: 4 },
  roomListParticipants: { alignItems: 'center', gap: 4 },
  roomListParticipantText: { fontSize: 12, fontWeight: '600', color: theme.primary },
  roomPrivacyBadge: { alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  privacyPublic: { backgroundColor: 'rgba(16,185,129,0.12)' },
  privacyPrivate: { backgroundColor: 'rgba(245,158,11,0.12)' },
  roomListActions: { alignItems: 'center', gap: 10 },
  inlineDeleteBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.12)' },
  joinBtn: { backgroundColor: theme.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  joinBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  roomHeader: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  roomHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  roomHeaderMeta: { alignItems: 'center', gap: 6, marginTop: 2 },
  roomLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.live },
  roomHeaderSub: { fontSize: 12, color: theme.textSecondary },
  deleteRoomBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239,68,68,0.22)', alignItems: 'center', justifyContent: 'center' },
  videoArea: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.5625, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  videoControls: { zIndex: 1 },
  videoBigPlayBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  hostBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  hostBadgeText: { fontSize: 11, fontWeight: '600', color: '#FFF' },
  roleBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  roleBadgePower: { backgroundColor: 'rgba(59,130,246,0.88)' },
  roleBadgeMember: { backgroundColor: 'rgba(75,85,99,0.88)' },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  updateRoomContentBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(99,102,241,0.88)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  updateRoomContentText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  reactionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  reactionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  reactionEmoji: { fontSize: 20 },
  typingBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.03)' },
  typingText: { fontSize: 12, color: theme.textSecondary, fontWeight: '600' },
  recentReactionBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingHorizontal: 12, paddingBottom: 8 },
  recentReactionPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(99,102,241,0.16)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  recentReactionEmoji: { fontSize: 14 },
  recentReactionText: { fontSize: 11, color: '#FFF', fontWeight: '700' },
  chatContainer: { flex: 1, backgroundColor: theme.backgroundSecondary },
  chatMsg: { gap: 10 },
  chatAvatarFallback: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  chatAvatarText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  chatNameRow: { alignItems: 'center', gap: 8 },
  chatName: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  chatTime: { fontSize: 11, color: theme.textMuted },
  chatText: { fontSize: 14, color: '#D1D5DB', lineHeight: 20, marginTop: 2 },
  chatInputRow: { alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.background },
  chatInput: { flex: 1, height: 42, backgroundColor: theme.surface, borderRadius: 21, paddingHorizontal: 16, fontSize: 14, color: '#FFF', borderWidth: 1, borderColor: theme.border },
  chatSendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
});
