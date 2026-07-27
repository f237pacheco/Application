import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAvailableSlotsForDate } from '@/lib/availability';
import { getParisNow } from '@/lib/booking';
import { sendBookingRescheduledToClient, sendBookingRescheduledToPro } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: string; date?: string; time?: string };
    const token = (body.token ?? '').trim();
    const date = (body.date ?? '').trim();
    const time = (body.time ?? '').trim();

    if (!token) return NextResponse.json({ error: 'Lien invalide' }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, user_id, client_name, client_email, client_phone, service_note, booking_date, booking_time, status')
      .eq('manage_token', token)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!booking) return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Ce rendez-vous a été annulé et ne peut plus être modifié.' }, { status: 409 });
    }

    const now = getParisNow();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [oy, om, od] = booking.booking_date.split('-').map(Number);
    const oldBookingDate = new Date(oy, om - 1, od);
    const [obh, obm] = booking.booking_time.slice(0, 5).split(':').map(Number);
    const isPast = oldBookingDate < today || (oldBookingDate.getTime() === today.getTime() && obh * 60 + obm <= now.getHours() * 60 + now.getMinutes());
    if (isPast) {
      return NextResponse.json({ error: 'Ce rendez-vous est déjà passé et ne peut plus être modifié.' }, { status: 409 });
    }

    // No-op: picking the exact same slot again.
    if (date === booking.booking_date && time === booking.booking_time) {
      return NextResponse.json({ success: true, date, time });
    }

    const { data: settings } = await supabase
      .from('booking_settings')
      .select('business_name, address, phone, logo_url, slot_duration, buffer_time, advance_booking_days')
      .eq('user_id', booking.user_id)
      .maybeSingle();
    if (!settings) return NextResponse.json({ error: 'Page de réservation introuvable' }, { status: 404 });

    const availableSlots = await getAvailableSlotsForDate(
      supabase,
      booking.user_id,
      date,
      settings.slot_duration,
      settings.buffer_time,
      settings.advance_booking_days
    );
    if (!availableSlots.includes(time)) {
      return NextResponse.json({ error: "Ce créneau n'est plus disponible" }, { status: 409 });
    }

    const previousDate = booking.booking_date;
    const previousTime = booking.booking_time;

    const { error: updateError } = await supabase
      .from('bookings')
      .update({ booking_date: date, booking_time: time })
      .eq('id', booking.id)
      .eq('manage_token', token);

    if (updateError) {
      if (updateError.code === '23505') {
        return NextResponse.json({ error: "Ce créneau vient d'être réservé par quelqu'un d'autre" }, { status: 409 });
      }
      throw updateError;
    }

    console.log(`[bookings/manage/reschedule] réservation ${booking.id} déplacée du ${previousDate} ${previousTime} vers le ${date} ${time}`);

    const { data: profile } = await supabase.from('profiles').select('email').eq('id', booking.user_id).maybeSingle();

    const emailData = {
      bookingId: booking.id,
      clientName: booking.client_name,
      clientEmail: booking.client_email,
      clientPhone: booking.client_phone ?? undefined,
      serviceNote: booking.service_note ?? undefined,
      businessName: settings.business_name,
      businessAddress: settings.address ?? undefined,
      businessPhone: settings.phone ?? undefined,
      businessLogoUrl: settings.logo_url ?? undefined,
      slotDuration: settings.slot_duration,
      date,
      time,
      proEmail: profile?.email ?? undefined,
      manageToken: token,
      previousDate,
      previousTime,
    };

    const [clientResult, proResult] = await Promise.allSettled([
      sendBookingRescheduledToClient(emailData),
      sendBookingRescheduledToPro(emailData),
    ]);
    if (clientResult.status === 'rejected') console.error('[bookings/manage/reschedule] EXCEPTION email client:', clientResult.reason);
    if (proResult.status === 'rejected') console.error('[bookings/manage/reschedule] EXCEPTION email pro:', proResult.reason);

    return NextResponse.json({ success: true, date, time });
  } catch (err) {
    console.error('[bookings/manage/reschedule]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
