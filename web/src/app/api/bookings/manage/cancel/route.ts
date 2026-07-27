import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getParisNow } from '@/lib/booking';
import { sendBookingCancellationToClient, sendBookingCancellationToPro } from '@/lib/email';

// Client-initiated cancellation via their own manage_token — the counterpart
// to /api/bookings/cancel, which is the pro-initiated (authenticated) version.
export async function POST(request: Request) {
  try {
    const { token } = await request.json() as { token?: string };
    if (!token) return NextResponse.json({ error: 'Lien invalide' }, { status: 400 });

    const supabase = createAdminClient();
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, user_id, client_name, client_email, client_phone, booking_date, booking_time, status')
      .eq('manage_token', token)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!booking) return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
    if (booking.status === 'cancelled') return NextResponse.json({ success: true });

    const now = getParisNow();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [y, m, d] = booking.booking_date.split('-').map(Number);
    const bookingDate = new Date(y, m - 1, d);
    const [bh, bm] = booking.booking_time.slice(0, 5).split(':').map(Number);
    const isPast = bookingDate < today || (bookingDate.getTime() === today.getTime() && bh * 60 + bm <= now.getHours() * 60 + now.getMinutes());
    if (isPast) {
      return NextResponse.json({ error: 'Ce rendez-vous est déjà passé et ne peut plus être annulé.' }, { status: 409 });
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', booking.id)
      .eq('manage_token', token);

    if (updateError) throw updateError;

    console.log(`[bookings/manage/cancel] réservation ${booking.id} annulée par le client — le créneau redevient disponible`);

    const [{ data: settings }, { data: profile }] = await Promise.all([
      supabase.from('booking_settings').select('business_name, address, phone, logo_url').eq('user_id', booking.user_id).maybeSingle(),
      supabase.from('profiles').select('email').eq('id', booking.user_id).maybeSingle(),
    ]);

    const emailData = {
      clientName: booking.client_name,
      clientEmail: booking.client_email,
      clientPhone: booking.client_phone ?? undefined,
      businessName: settings?.business_name ?? 'votre prestataire',
      businessAddress: settings?.address ?? undefined,
      businessPhone: settings?.phone ?? undefined,
      businessLogoUrl: settings?.logo_url ?? undefined,
      date: booking.booking_date,
      time: booking.booking_time,
      proEmail: profile?.email ?? undefined,
    };

    const [clientResult, proResult] = await Promise.allSettled([
      sendBookingCancellationToClient(emailData),
      sendBookingCancellationToPro(emailData),
    ]);
    if (clientResult.status === 'rejected') console.error('[bookings/manage/cancel] EXCEPTION email client:', clientResult.reason);
    if (proResult.status === 'rejected') console.error('[bookings/manage/cancel] EXCEPTION email pro:', proResult.reason);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[bookings/manage/cancel]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
