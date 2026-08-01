import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getParisNow } from '@/lib/booking';

// Never cache: whether a booking can still be managed depends on "now",
// which changes every second.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = (searchParams.get('token') ?? '').trim();

  if (!token) {
    return NextResponse.json({ error: 'Lien invalide' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id, user_id, client_name, client_email, client_phone, service_note, booking_date, booking_time, status')
      .eq('manage_token', token)
      .maybeSingle();

    if (error) throw error;
    if (!booking) {
      console.warn(`[bookings/manage/lookup] token inconnu — lien invalide ou déjà utilisé sur une base différente`);
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
    }

    const { data: settings } = await supabase
      .from('booking_settings')
      .select('business_name, slug, address, phone, logo_url, slot_duration, buffer_time, advance_booking_days')
      .eq('user_id', booking.user_id)
      .maybeSingle();

    if (!settings) {
      return NextResponse.json({ error: 'Page de réservation introuvable' }, { status: 404 });
    }

    const now = getParisNow();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [y, m, d] = booking.booking_date.split('-').map(Number);
    const bookingDate = new Date(y, m - 1, d);
    const [bh, bm] = booking.booking_time.slice(0, 5).split(':').map(Number);
    const isPast = bookingDate < today || (bookingDate.getTime() === today.getTime() && bh * 60 + bm <= now.getHours() * 60 + now.getMinutes());

    return NextResponse.json({
      booking: {
        clientName: booking.client_name,
        clientEmail: booking.client_email,
        clientPhone: booking.client_phone,
        serviceNote: booking.service_note,
        date: booking.booking_date,
        time: booking.booking_time,
        status: booking.status,
      },
      business: {
        businessName: settings.business_name,
        slug: settings.slug,
        address: settings.address,
        phone: settings.phone,
        logoUrl: settings.logo_url,
        slotDuration: settings.slot_duration,
        bufferTime: settings.buffer_time,
        advanceBookingDays: settings.advance_booking_days,
      },
      isPast,
    });
  } catch (err) {
    console.error('[bookings/manage/lookup]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
