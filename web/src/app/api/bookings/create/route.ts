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
      .select('user_id, business_name, address, phone, logo_url, slot_duration, buffer_time, advance_booking_days')
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

    const { data: newBooking, error: insertError } = await supabase.from('bookings').insert({
      user_id: settings.user_id,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone || null,
      service_note: serviceNote || null,
      booking_date: date,
      booking_time: time,
      status: 'confirmed',
    }).select('id').single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: "Ce créneau vient d'être réservé par quelqu'un d'autre" }, { status: 409 });
      }
      throw insertError;
    }

    console.log(`[bookings/create] Réservation créée en base pour ${clientEmail} le ${date} à ${time}`);

    const { data: proProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', settings.user_id)
      .maybeSingle();

    console.log(`[bookings/create] Email du pro trouvé: ${proProfile?.email ?? 'AUCUN — la notification pro sera sautée'}`);

    const emailData = {
      bookingId: newBooking.id as string,
      clientName,
      clientEmail,
      clientPhone: clientPhone || undefined,
      serviceNote: serviceNote || undefined,
      businessName: settings.business_name,
      businessAddress: settings.address ?? undefined,
      businessPhone: settings.phone ?? undefined,
      businessLogoUrl: settings.logo_url ?? undefined,
      slotDuration: settings.slot_duration,
      date,
      time,
      proEmail: proProfile?.email ?? undefined,
    };

    console.log('[bookings/create] Appel des fonctions d\'envoi d\'email (confirmation client + notification pro)...');
    // allSettled, pas all : un échec/exception sur l'un des deux envois ne doit
    // jamais empêcher l'autre de partir (avant ce correctif, Promise.all pouvait
    // faire échouer silencieusement les DEUX emails si un seul levait une exception).
    const [clientResult, proResult] = await Promise.allSettled([
      sendBookingConfirmationToClient(emailData),
      sendBookingNotificationToPro(emailData),
    ]);
    if (clientResult.status === 'rejected') console.error('[bookings/create] EXCEPTION email client (non rattrapée par lib/email.ts):', clientResult.reason);
    if (proResult.status === 'rejected') console.error('[bookings/create] EXCEPTION email pro (non rattrapée par lib/email.ts):', proResult.reason);
    console.log('[bookings/create] Envoi des emails terminé (voir logs [email] ci-dessus pour le résultat de chacun).');

    return NextResponse.json({ success: true, date, time, bookingId: newBooking.id });
  } catch (err) {
    console.error('[bookings/create]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
