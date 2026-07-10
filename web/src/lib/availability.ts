import type { SupabaseClient } from '@supabase/supabase-js';
import { generateSlots, timeToMinutes, toDateKey, getParisNow } from '@/lib/booking';

// Server-only: computes free slots for a given pro/date, accounting for
// blocked days, recurring weekly availability and already-taken bookings.
export async function getAvailableSlotsForDate(
  supabase: SupabaseClient,
  userId: string,
  dateStr: string,
  slotDuration: number,
  bufferTime: number,
  advanceBookingDays: number
): Promise<string[]> {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  if (Number.isNaN(date.getTime())) return [];

  const now = getParisNow();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date < today) return [];

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + advanceBookingDays);
  if (date > maxDate) return [];

  const { data: blocked } = await supabase
    .from('blocked_dates')
    .select('id')
    .eq('user_id', userId)
    .eq('date', dateStr)
    .maybeSingle();
  if (blocked) return [];

  const dayOfWeek = date.getDay();
  const { data: ranges } = await supabase
    .from('availability')
    .select('start_time, end_time')
    .eq('user_id', userId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true);

  if (!ranges || ranges.length === 0) return [];

  let slots = generateSlots(
    ranges.map((r: { start_time: string; end_time: string }) => ({
      start: r.start_time.slice(0, 5),
      end: r.end_time.slice(0, 5),
    })),
    slotDuration,
    bufferTime
  );

  const { data: existing } = await supabase
    .from('bookings')
    .select('booking_time')
    .eq('user_id', userId)
    .eq('booking_date', dateStr)
    .neq('status', 'cancelled');

  const takenTimes = new Set((existing ?? []).map((b: { booking_time: string }) => b.booking_time.slice(0, 5)));
  slots = slots.filter((s) => !takenTimes.has(s));

  if (toDateKey(date) === toDateKey(now)) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    slots = slots.filter((s) => timeToMinutes(s) > nowMinutes);
  }

  return slots;
}
