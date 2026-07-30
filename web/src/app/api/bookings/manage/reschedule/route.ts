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
    console.log(`[bookings/manage/reschedule][étape 1/7] requête reçue: token="${token || '(absent)'}" date="${date}" time="${time}"`);

    if (!token) return NextResponse.json({ error: 'Lien invalide' }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      console.warn(`[bookings/manage/reschedule][étape 1/7] date/heure au mauvais format — rejeté`);
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, user_id, client_name, client_email, client_phone, service_note, booking_date, booking_time, status')
      .eq('manage_token', token)
      .maybeSingle();

    if (fetchError) {
      console.error('[bookings/manage/reschedule][étape 2/7] ERREUR recherche réservation par token:', fetchError);
      throw fetchError;
    }
    if (!booking) {
      console.warn(`[bookings/manage/reschedule][étape 2/7] aucune réservation pour ce token — lien invalide`);
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
    }
    console.log(`[bookings/manage/reschedule][étape 2/7] réservation trouvée: id=${booking.id} statut="${booking.status}" créneau actuel=${booking.booking_date} ${booking.booking_time}`);
    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Ce rendez-vous a été annulé et ne peut plus être modifié.' }, { status: 409 });
    }

    const now = getParisNow();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [oy, om, od] = booking.booking_date.split('-').map(Number);
    const oldBookingDate = new Date(oy, om - 1, od);
    const [obh, obm] = booking.booking_time.slice(0, 5).split(':').map(Number);
    const isPast = oldBookingDate < today || (oldBookingDate.getTime() === today.getTime() && obh * 60 + obm <= now.getHours() * 60 + now.getMinutes());
    console.log(`[bookings/manage/reschedule][étape 3/7] vérification passé/futur du créneau ACTUEL: isPast=${isPast}`);
    if (isPast) {
      return NextResponse.json({ error: 'Ce rendez-vous est déjà passé et ne peut plus être modifié.' }, { status: 409 });
    }

    if (date === booking.booking_date && time === booking.booking_time) {
      console.log(`[bookings/manage/reschedule][étape 3/7] même créneau que l'actuel — aucun changement à faire`);
      return NextResponse.json({ success: true, date, time });
    }

    const { data: settings, error: settingsError } = await supabase
      .from('booking_settings')
      .select('business_name, address, phone, logo_url, services, instructions, payment_methods, slot_duration, buffer_time, advance_booking_days')
      .eq('user_id', booking.user_id)
      .maybeSingle();
    if (settingsError) console.error('[bookings/manage/reschedule][étape 4/7] ERREUR lecture booking_settings:', settingsError);
    if (!settings) {
      console.warn('[bookings/manage/reschedule][étape 4/7] aucun booking_settings trouvé pour ce user_id — 404');
      return NextResponse.json({ error: 'Page de réservation introuvable' }, { status: 404 });
    }
    console.log(`[bookings/manage/reschedule][étape 4/7] réglages trouvés: business_name="${settings.business_name}" slot_duration=${settings.slot_duration}`);

    const availableSlots = await getAvailableSlotsForDate(
      supabase,
      booking.user_id,
      date,
      settings.slot_duration,
      settings.buffer_time,
      settings.advance_booking_days
    );
    console.log(`[bookings/manage/reschedule][étape 5/7] créneaux libres le ${date}: [${availableSlots.join(', ')}] — "${time}" demandé est ${availableSlots.includes(time) ? 'DISPONIBLE' : 'INDISPONIBLE'}`);
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
      console.error('[bookings/manage/reschedule][étape 6/7] ERREUR mise à jour en base:', updateError);
      if (updateError.code === '23505') {
        return NextResponse.json({ error: "Ce créneau vient d'être réservé par quelqu'un d'autre" }, { status: 409 });
      }
      throw updateError;
    }

    console.log(`[bookings/manage/reschedule][étape 6/7] réservation ${booking.id} déplacée en base: ${previousDate} ${previousTime} -> ${date} ${time} (ancien créneau libéré)`);

    const { data: profile, error: profileError } = await supabase.from('profiles').select('email').eq('id', booking.user_id).maybeSingle();
    if (profileError) console.error('[bookings/manage/reschedule][étape 7/7] ERREUR lecture profiles:', profileError);

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
      businessServices: settings.services ?? undefined,
      businessInstructions: settings.instructions ?? undefined,
      businessPaymentMethods: settings.payment_methods ?? undefined,
      slotDuration: settings.slot_duration,
      date,
      time,
      proEmail: profile?.email ?? undefined,
      manageToken: token,
      previousDate,
      previousTime,
    };

    console.log(`[bookings/manage/reschedule][étape 7/7] appel des fonctions d'envoi d'email — destinataire client="${emailData.clientEmail}" | destinataire pro="${emailData.proEmail ?? '(aucun, notification pro sautée)'}"`);
    const [clientResult, proResult] = await Promise.allSettled([
      sendBookingRescheduledToClient(emailData),
      sendBookingRescheduledToPro(emailData),
    ]);
    console.log(`[bookings/manage/reschedule][étape 7/7] email client: ${clientResult.status}${clientResult.status === 'rejected' ? ' — ' + clientResult.reason : ''}`);
    console.log(`[bookings/manage/reschedule][étape 7/7] email pro: ${proResult.status}${proResult.status === 'rejected' ? ' — ' + proResult.reason : ''}`);
    console.log(`[bookings/manage/reschedule][étape 7/7] terminé (voir les logs [email] ci-dessus pour la réponse Resend complète de chaque envoi) — réponse envoyée au client: success=true, date=${date}, time=${time}`);

    return NextResponse.json({ success: true, date, time });
  } catch (err) {
    console.error('[bookings/manage/reschedule] EXCEPTION NON RATTRAPÉE — la requête va échouer avec une erreur 500:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
