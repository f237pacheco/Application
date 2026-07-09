import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAvailableSlotsForDate } from '@/lib/availability';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get('slug') ?? '').trim().toLowerCase();
  const date = (searchParams.get('date') ?? '').trim();

  console.log(`[bookings/availability] slug="${slug}" date="${date}"`);

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

    console.log(`[bookings/availability] réponse Supabase complète:`, JSON.stringify({ data: settings, error }));

    if (error) throw error;
    if (!settings) {
      console.warn(`[bookings/availability] AUCUNE ligne booking_settings pour slug="${slug}" — 404`);
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
    console.error(`[bookings/availability] EXCEPTION pour slug="${slug}":`, JSON.stringify(err), err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
