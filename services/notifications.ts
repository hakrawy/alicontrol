import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  level: NotificationLevel;
  createdAt: string;
  readAt: string | null;
  dedupeKey?: string;
}

const NOTIFICATIONS_KEY = 'app_notifications_v1';
const NOTIFICATIONS_LIMIT = 20;

function createNotificationId() {
  return `note_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readNotifications() {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AppNotification[]) : [];
  } catch {
    return [];
  }
}

async function saveNotifications(entries: AppNotification[]) {
  await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(entries.slice(0, NOTIFICATIONS_LIMIT)));
}

export async function fetchNotifications() {
  return readNotifications();
}

export async function recordNotification(entry: Omit<AppNotification, 'id' | 'createdAt' | 'readAt'> & { createdAt?: string; readAt?: string | null }) {
  const current = await readNotifications();
  if (entry.dedupeKey && current.some((note) => note.dedupeKey === entry.dedupeKey)) {
    return current.find((note) => note.dedupeKey === entry.dedupeKey) || null;
  }

  const next: AppNotification = {
    id: createNotificationId(),
    title: String(entry.title || 'Notification'),
    body: String(entry.body || ''),
    level: entry.level || 'info',
    createdAt: entry.createdAt || new Date().toISOString(),
    readAt: entry.readAt ?? null,
    dedupeKey: entry.dedupeKey,
  };

  await saveNotifications([next, ...current]);
  return next;
}

export async function markNotificationRead(id: string) {
  const current = await readNotifications();
  const next = current.map((note) => (note.id === id ? { ...note, readAt: note.readAt || new Date().toISOString() } : note));
  await saveNotifications(next);
  return next;
}

export async function markAllNotificationsRead() {
  const current = await readNotifications();
  const now = new Date().toISOString();
  const next = current.map((note) => ({ ...note, readAt: note.readAt || now }));
  await saveNotifications(next);
  return next;
}

export async function clearNotifications() {
  await AsyncStorage.removeItem(NOTIFICATIONS_KEY);
}

export async function getUnreadNotificationCount() {
  const current = await readNotifications();
  return current.filter((note) => !note.readAt).length;
}
