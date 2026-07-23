import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAvailableSlotsForDate } from '@/lib/availability';
import { toDateKey, getParisNow } from '@/lib/booking';

// Which dates are bookable changes constantly (new bookings, blocked dates,
// the passage of "today" itself) — never let this be served from a stale cache.
export const dynamic = 'force-dynamic';

// Returns which days of a given month have at least one free slot, so the
// public booking page can grey out empty/blocked days without one request per day.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get('slug') ?? '').trim().toLowerCase();
  const year = Number(searchParams.get('year'));
  const month = Number(searchParams.get('month')); // 1-12

  console.log(`[bookings/calendar] slug="${slug}" year=${year} month=${month}`);

  if (!slug || !Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: settings, error } = await supabase
      .from('booking_settings')
      .select('user_id, slot_duration, buffer_time, advance_booking_days')
      .eq('slug', slug)
      .maybeSingle();

    console.log(`[bookings/calendar] réponse Supabase complète:`, JSON.stringify({ data: settings, error }));

    if (error) throw error;
    if (!settings) {
      console.warn(`[bookings/calendar] AUCUNE ligne booking_settings pour slug="${slug}" — 404`);
      return NextResponse.json({ error: 'Page de réservation introuvable' }, { status: 404 });
    }

    const today = getParisNow();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + settings.advance_booking_days);

    const daysInMonth = new Date(year, month, 0).getDate();
    const availableDates: string[] = [];
    const slotCounts: Record<string, number> = {};

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      if (date < today || date > maxDate) continue;
      const dateKey = toDateKey(date);
      const slots = await getAvailableSlotsForDate(
        supabase,
        settings.user_id,
        dateKey,
        settings.slot_duration,
        settings.buffer_time,
        settings.advance_booking_days
      );
      if (slots.length > 0) {
        availableDates.push(dateKey);
        slotCounts[dateKey] = slots.length;
      }
    }

    return NextResponse.json({ availableDates, slotCounts });
  } catch (err) {
    console.error(`[bookings/calendar] EXCEPTION pour slug="${slug}":`, JSON.stringify(err), err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
