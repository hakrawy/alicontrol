import AsyncStorage from '@react-native-async-storage/async-storage';

export type AdminActivityLevel = 'info' | 'success' | 'warning' | 'error';

export interface AdminActivityEntry {
  id: string;
  title: string;
  detail: string;
  level: AdminActivityLevel;
  createdAt: string;
}

const ADMIN_ACTIVITY_KEY = 'admin_activity_log_v1';
const ADMIN_ACTIVITY_LIMIT = 12;

function createActivityId() {
  return `admin_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function fetchAdminActivity() {
  try {
    const raw = await AsyncStorage.getItem(ADMIN_ACTIVITY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AdminActivityEntry[]) : [];
  } catch {
    return [];
  }
}

export async function recordAdminActivity(entry: Omit<AdminActivityEntry, 'id' | 'createdAt'> & { createdAt?: string }) {
  const current = await fetchAdminActivity();
  const next: AdminActivityEntry = {
    id: createActivityId(),
    title: String(entry.title || 'Activity'),
    detail: String(entry.detail || ''),
    level: entry.level || 'info',
    createdAt: entry.createdAt || new Date().toISOString(),
  };

  const nextLog = [next, ...current].slice(0, ADMIN_ACTIVITY_LIMIT);
  await AsyncStorage.setItem(ADMIN_ACTIVITY_KEY, JSON.stringify(nextLog));
  return next;
}

export async function clearAdminActivity() {
  await AsyncStorage.removeItem(ADMIN_ACTIVITY_KEY);
}
