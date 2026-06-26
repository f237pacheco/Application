import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get('slug') ?? '').trim().toLowerCase();

  if (!slug) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: settings, error } = await supabase
      .from('booking_settings')
      .select('business_name, description, slot_duration, advance_booking_days')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    if (!settings) {
      return NextResponse.json({ error: 'Page de réservation introuvable' }, { status: 404 });
    }

    return NextResponse.json({
      businessName: settings.business_name,
      description: settings.description,
      slotDuration: settings.slot_duration,
      advanceBookingDays: settings.advance_booking_days,
    });
  } catch (err) {
    console.error('[bookings/info]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
