import { getSupabaseClient } from '@/template';
import type { RoomMessage, WatchRoom } from './api';

export type WatchRoomRealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'disconnected';

export type RoomPlaybackEventType =
  | 'play'
  | 'pause'
  | 'seek'
  | 'source_change'
  | 'subtitle_change'
  | 'sync_ping'
  | 'sync_ack'
  | 'content_change'
  | 'typing'
  | 'reaction'
  | 'join'
  | 'leave';

export interface RoomPlaybackEvent {
  id: string;
  room_id: string;
  actor_id: string;
  event_type: RoomPlaybackEventType;
  media_id?: string | null;
  media_type?: 'movie' | 'series' | 'episode' | 'channel' | null;
  position_ms?: number;
  playback_rate?: number;
  payload?: Record<string, any>;
  sequence_no?: number;
  server_ts?: string;
  client_ts?: string;
}

export interface RoomPresenceMember {
  userId: string;
  username: string;
  avatar?: string | null;
  role?: string;
  joinedAt: string;
  lastSeenAt: string;
}

interface StartRoomRealtimeArgs {
  roomId: string;
  userId: string;
  username?: string | null;
  avatar?: string | null;
  onStatus?: (status: WatchRoomRealtimeStatus) => void;
  onMessage?: (message: RoomMessage) => void;
  onRoomUpdate?: (room: WatchRoom) => void;
  onPlaybackEvent?: (event: RoomPlaybackEvent) => void;
  onControlEvent?: (event: RoomPlaybackEvent) => void;
  onPresence?: (members: RoomPresenceMember[]) => void;
}

function normalizeMessageRow(row: any, profile?: { username?: string | null; avatar?: string | null }): RoomMessage {
  return {
    id: row.id,
    room_id: row.room_id,
    user_id: row.user_id,
    message: row.message,
    created_at: row.created_at,
    user: {
      username: profile?.username || 'User',
      avatar: profile?.avatar || '',
    },
  };
}

async function fetchProfile(userId: string) {
  const supabase = getSupabaseClient();
  const { data } = await supabase.from('user_profiles').select('username, avatar').eq('id', userId).maybeSingle();
  return data || null;
}

function dedupeById<T extends { id: string }>(items: T[]) {
  const map = new Map<string, T>();
  items.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

function mapPresenceState(state: Record<string, Array<Record<string, any>>>) {
  const members: RoomPresenceMember[] = [];
  Object.entries(state || {}).forEach(([key, entries]) => {
    entries.forEach((entry) => {
      const meta = entry?.metas?.[0] || entry || {};
      members.push({
        userId: meta.userId || key,
        username: meta.username || 'User',
        avatar: meta.avatar || null,
        role: meta.role || 'member',
        joinedAt: meta.joinedAt || meta.joined_at || new Date().toISOString(),
        lastSeenAt: meta.lastSeenAt || meta.last_seen_at || new Date().toISOString(),
      });
    });
  });
  return members;
}

export function startWatchRoomRealtime(args: StartRoomRealtimeArgs) {
  const supabase = getSupabaseClient();
  const chatChannel = supabase.channel(`room:${args.roomId}:chat`);
  const presenceChannel = supabase.channel(`room:${args.roomId}:presence`);
  const playbackChannel = supabase.channel(`room:${args.roomId}:playback`);
  const controlChannel = supabase.channel(`room:${args.roomId}:control`);
  const roomStateChannel = supabase.channel(`room:${args.roomId}:state`);

  let disposed = false;
  let presenceTracked = false;

  const setStatus = (status: WatchRoomRealtimeStatus) => {
    if (!disposed) {
      args.onStatus?.(status);
    }
  };

  const initialize = async () => {
    setStatus('connecting');

    chatChannel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${args.roomId}` },
      async (payload: any) => {
        const profile = await fetchProfile(payload.new.user_id).catch(() => null);
        if (!disposed) {
          args.onMessage?.(normalizeMessageRow(payload.new, profile || undefined));
        }
      }
    );

    roomStateChannel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'watch_rooms', filter: `id=eq.${args.roomId}` },
      (payload: any) => {
        if (disposed) return;
        args.onRoomUpdate?.(payload.new as WatchRoom);
      }
    );

    presenceChannel.on('presence', { event: 'sync' }, () => {
      if (disposed) return;
      args.onPresence?.(mapPresenceState(presenceChannel.presenceState() as Record<string, Array<Record<string, any>>>));
    });

    presenceChannel.on('presence', { event: 'join' }, () => {
      if (disposed) return;
      args.onPresence?.(mapPresenceState(presenceChannel.presenceState() as Record<string, Array<Record<string, any>>>));
    });

    presenceChannel.on('presence', { event: 'leave' }, () => {
      if (disposed) return;
      args.onPresence?.(mapPresenceState(presenceChannel.presenceState() as Record<string, Array<Record<string, any>>>));
    });

    playbackChannel.on('broadcast', { event: 'room_playback_event' }, (payload: any) => {
      if (disposed) return;
      args.onPlaybackEvent?.(payload.payload as RoomPlaybackEvent);
    });

    controlChannel.on('broadcast', { event: 'room_control_event' }, (payload: any) => {
      if (disposed) return;
      args.onControlEvent?.(payload.payload as RoomPlaybackEvent);
    });

    roomStateChannel.subscribe((status) => {
      if (disposed) return;
      if (status === 'SUBSCRIBED') {
        setStatus('connected');
      } else if (status === 'CHANNEL_ERROR') {
        setStatus('error');
      } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
        setStatus('disconnected');
      } else {
        setStatus('reconnecting');
      }
    });

    chatChannel.subscribe();
    presenceChannel.subscribe(async (status) => {
      if (disposed) return;
      if (status === 'SUBSCRIBED' && !presenceTracked) {
        presenceTracked = true;
        await presenceChannel.track({
          userId: args.userId,
          username: args.username || 'User',
          avatar: args.avatar || '',
          joinedAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
        });
      }
      if (status === 'CHANNEL_ERROR') {
        setStatus('error');
      }
    });
    playbackChannel.subscribe();
    controlChannel.subscribe();
  };

  void initialize();

  return {
    async sendChatMessage(message: RoomMessage) {
      if (disposed) return;
      await chatChannel.send({
        type: 'broadcast',
        event: 'room_chat_message',
        payload: message,
      });
    },
    async sendPlaybackEvent(event: RoomPlaybackEvent) {
      if (disposed) return;
      await playbackChannel.send({
        type: 'broadcast',
        event: 'room_playback_event',
        payload: event,
      });
    },
    async sendControlEvent(event: RoomPlaybackEvent) {
      if (disposed) return;
      await controlChannel.send({
        type: 'broadcast',
        event: 'room_control_event',
        payload: event,
      });
    },
    async refreshPresence() {
      if (disposed) return;
      await presenceChannel.track({
        userId: args.userId,
        username: args.username || 'User',
        avatar: args.avatar || '',
        joinedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      });
    },
    async cleanup() {
      disposed = true;
      await Promise.all([
        chatChannel.unsubscribe(),
        presenceChannel.unsubscribe(),
        playbackChannel.unsubscribe(),
        controlChannel.unsubscribe(),
        roomStateChannel.unsubscribe(),
      ].map((task) => task.catch(() => undefined)));
    },
    dedupeMessages<T extends RoomMessage>(messages: T[]) {
      return dedupeById(messages);
    },
  };
}
