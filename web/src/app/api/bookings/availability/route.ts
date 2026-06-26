import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAvailableSlotsForDate } from '@/lib/availability';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get('slug') ?? '').trim().toLowerCase();
  const date = (searchParams.get('date') ?? '').trim();

  if (!slug || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: settings, error } = await supabase
      .from('booking_settings')
      .select('user_id, slot_duration, buffer_time, advance_booking_days')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    if (!settings) {
      return NextResponse.json({ error: 'Page de réservation introuvable' }, { status: 404 });
    }

    const slots = await getAvailableSlotsForDate(
      supabase,
      settings.user_id,
      date,
      settings.slot_duration,
      settings.buffer_time,
      settings.advance_booking_days
    );

    return NextResponse.json({ slots });
  } catch (err) {
    console.error('[bookings/availability]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
