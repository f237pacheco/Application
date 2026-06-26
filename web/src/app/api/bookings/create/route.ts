import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAvailableSlotsForDate } from '@/lib/availability';
import { sendBookingConfirmationToClient, sendBookingNotificationToPro } from '@/lib/email';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      slug?: string;
      date?: string;
      time?: string;
      clientName?: string;
      clientEmail?: string;
      clientPhone?: string;
      serviceNote?: string;
    };

    const slug = (body.slug ?? '').trim().toLowerCase();
    const date = (body.date ?? '').trim();
    const time = (body.time ?? '').trim();
    const clientName = (body.clientName ?? '').trim();
    const clientEmail = (body.clientEmail ?? '').trim();
    const clientPhone = (body.clientPhone ?? '').trim();
    const serviceNote = (body.serviceNote ?? '').trim();

    if (!slug || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
    }
    if (!clientName || clientName.length > 200) {
      return NextResponse.json({ error: 'Nom requis' }, { status: 400 });
    }
    if (!EMAIL_REGEX.test(clientEmail)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: settings, error: settingsError } = await supabase
      .from('booking_settings')
      .select('user_id, business_name, slot_duration, buffer_time, advance_booking_days')
      .eq('slug', slug)
      .maybeSingle();

    if (settingsError) throw settingsError;
    if (!settings) {
      return NextResponse.json({ error: 'Page de réservation introuvable' }, { status: 404 });
    }

    // Re-verify the slot is genuinely free right now (anti-tamper + anti-double-booking)
    const availableSlots = await getAvailableSlotsForDate(
      supabase,
      settings.user_id,
      date,
      settings.slot_duration,
      settings.buffer_time,
      settings.advance_booking_days
    );
    if (!availableSlots.includes(time)) {
      return NextResponse.json({ error: "Ce créneau n'est plus disponible" }, { status: 409 });
    }

    const { error: insertError } = await supabase.from('bookings').insert({
      user_id: settings.user_id,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone || null,
      service_note: serviceNote || null,
      booking_date: date,
      booking_time: time,
      status: 'confirmed',
    });

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: "Ce créneau vient d'être réservé par quelqu'un d'autre" }, { status: 409 });
      }
      throw insertError;
    }

    const { data: proProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', settings.user_id)
      .maybeSingle();

    const emailData = {
      clientName,
      clientEmail,
      clientPhone: clientPhone || undefined,
      serviceNote: serviceNote || undefined,
      businessName: settings.business_name,
      date,
      time,
      proEmail: proProfile?.email ?? undefined,
    };

    await Promise.all([
      sendBookingConfirmationToClient(emailData),
      sendBookingNotificationToPro(emailData),
    ]);

    return NextResponse.json({ success: true, date, time });
  } catch (err) {
    console.error('[bookings/create]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
