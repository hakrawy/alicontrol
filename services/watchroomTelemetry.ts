import { getSupabaseClient } from '@/template';

export type RoomTelemetryMetricType =
  | 'join_latency'
  | 'message_latency'
  | 'sync_delay'
  | 'reconnect'
  | 'rate_limited'
  | 'poll_latency';

interface RoomTelemetryInput {
  roomId: string;
  metricType: RoomTelemetryMetricType;
  value: number;
  userId?: string | null;
  metadata?: Record<string, any>;
}

export async function recordRoomTelemetry(input: RoomTelemetryInput) {
  const supabase = getSupabaseClient();
  await supabase.from('room_telemetry').insert({
    room_id: input.roomId,
    user_id: input.userId || null,
    metric_type: input.metricType,
    value: input.value,
    metadata: input.metadata || {},
  }).throwOnError();
}
