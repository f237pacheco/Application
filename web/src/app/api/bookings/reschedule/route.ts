import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getAvailableSlotsForDate } from '@/lib/availability';
import { sendBookingRescheduledToClient } from '@/lib/email';

// Pro-initiated reschedule from the appointments dashboard — the client only
// gets notified (the pro is the one making the change, so no self-notification).
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as { bookingId?: string; date?: string; time?: string };
    const bookingId = (body.bookingId ?? '').trim();
    const date = (body.date ?? '').trim();
    const time = (body.time ?? '').trim();

    if (!bookingId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
    }

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, client_name, client_email, client_phone, service_note, booking_date, booking_time, status, manage_token')
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!booking) return NextResponse.json({ error: 'RDV introuvable' }, { status: 404 });
    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Un rendez-vous annulé ne peut pas être reprogrammé.' }, { status: 409 });
    }

    if (date === booking.booking_date && time === booking.booking_time) {
      return NextResponse.json({ success: true, date, time });
    }

    const { data: settings } = await supabase
      .from('booking_settings')
      .select('business_name, address, phone, logo_url, services, instructions, payment_methods, slot_duration, buffer_time, advance_booking_days')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!settings) return NextResponse.json({ error: 'Réglages introuvables' }, { status: 404 });

    const availableSlots = await getAvailableSlotsForDate(
      supabase,
      user.id,
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
      .eq('id', bookingId)
      .eq('user_id', user.id);

    if (updateError) {
      if (updateError.code === '23505') {
        return NextResponse.json({ error: "Ce créneau est déjà occupé par un autre rendez-vous" }, { status: 409 });
      }
      throw updateError;
    }

    console.log(`[bookings/reschedule] réservation ${bookingId} déplacée par le pro du ${previousDate} ${previousTime} vers le ${date} ${time}`);

    await sendBookingRescheduledToClient({
      bookingId: booking.id,
      clientName: booking.client_name,
      clientEmail: booking.client_email,
      clientPhone: booking.client_phone ?? undefined,
      serviceNote: booking.service_note ?? undefined,
      businessName: settings.business_name,
      businessAddress: settings.address ?? undefined,
      businessPhone: settings.phone ?? undefined,
      businessLogoUrl: settings.logo_url ?? undefined,
      businessServices: settings.services ?? undefined,
      businessInstructions: settings.instructions ?? undefined,
      businessPaymentMethods: settings.payment_methods ?? undefined,
      slotDuration: settings.slot_duration,
      date,
      time,
      manageToken: booking.manage_token ?? undefined,
      previousDate,
      previousTime,
    });

    return NextResponse.json({ success: true, date, time });
  } catch (err) {
    console.error('[bookings/reschedule]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
