import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getParisNow } from '@/lib/booking';
import { sendBookingCancellationToClient, sendBookingCancellationToPro } from '@/lib/email';

// Client-initiated cancellation via their own manage_token — the counterpart
// to /api/bookings/cancel, which is the pro-initiated (authenticated) version.
export async function POST(request: Request) {
  try {
    const { token } = await request.json() as { token?: string };
    console.log(`[bookings/manage/cancel][étape 1/6] requête reçue, token="${token ?? '(absent)'}"`);
    if (!token) return NextResponse.json({ error: 'Lien invalide' }, { status: 400 });

    const supabase = createAdminClient();
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, user_id, client_name, client_email, client_phone, booking_date, booking_time, status')
      .eq('manage_token', token)
      .maybeSingle();

    if (fetchError) {
      console.error('[bookings/manage/cancel][étape 2/6] ERREUR lors de la recherche de la réservation par token:', fetchError);
      throw fetchError;
    }
    if (!booking) {
      console.warn(`[bookings/manage/cancel][étape 2/6] aucune réservation trouvée pour ce token — lien invalide`);
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
    }
    console.log(`[bookings/manage/cancel][étape 2/6] réservation trouvée: id=${booking.id} statut actuel="${booking.status}" client="${booking.client_email}"`);
    if (booking.status === 'cancelled') {
      console.log(`[bookings/manage/cancel][étape 2/6] déjà annulée — réponse succès sans rien refaire`);
      return NextResponse.json({ success: true });
    }

    const now = getParisNow();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [y, m, d] = booking.booking_date.split('-').map(Number);
    const bookingDate = new Date(y, m - 1, d);
    const [bh, bm] = booking.booking_time.slice(0, 5).split(':').map(Number);
    const isPast = bookingDate < today || (bookingDate.getTime() === today.getTime() && bh * 60 + bm <= now.getHours() * 60 + now.getMinutes());
    console.log(`[bookings/manage/cancel][étape 3/6] vérification passé/futur: booking_date=${booking.booking_date} booking_time=${booking.booking_time} isPast=${isPast}`);
    if (isPast) {
      return NextResponse.json({ error: 'Ce rendez-vous est déjà passé et ne peut plus être annulé.' }, { status: 409 });
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', booking.id)
      .eq('manage_token', token);

    if (updateError) {
      console.error('[bookings/manage/cancel][étape 4/6] ERREUR lors de la mise à jour du statut en base:', updateError);
      throw updateError;
    }
    console.log(`[bookings/manage/cancel][étape 4/6] statut mis à jour en base -> 'cancelled' pour la réservation ${booking.id} — le créneau redevient disponible`);

    const [{ data: settings, error: settingsError }, { data: profile, error: profileError }] = await Promise.all([
      supabase.from('booking_settings').select('business_name, address, phone, logo_url').eq('user_id', booking.user_id).maybeSingle(),
      supabase.from('profiles').select('email').eq('id', booking.user_id).maybeSingle(),
    ]);
    if (settingsError) console.error('[bookings/manage/cancel][étape 5/6] ERREUR lecture booking_settings (les emails partiront quand même, avec des valeurs par défaut):', settingsError);
    if (profileError) console.error('[bookings/manage/cancel][étape 5/6] ERREUR lecture profiles (email du pro introuvable -> notification pro sautée):', profileError);
    console.log(`[bookings/manage/cancel][étape 5/6] settings trouvés=${!!settings} (business_name="${settings?.business_name ?? '(aucun)'}") | email du pro trouvé="${profile?.email ?? '(AUCUN — notification pro sautée)'}"`);

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

    console.log(`[bookings/manage/cancel][étape 6/6] appel des fonctions d'envoi d'email — destinataire client="${emailData.clientEmail}" | destinataire pro="${emailData.proEmail ?? '(aucun, notification pro sautée)'}"`);
    const [clientResult, proResult] = await Promise.allSettled([
      sendBookingCancellationToClient(emailData),
      sendBookingCancellationToPro(emailData),
    ]);
    console.log(`[bookings/manage/cancel][étape 6/6] email client: ${clientResult.status}${clientResult.status === 'rejected' ? ' — ' + clientResult.reason : ''}`);
    console.log(`[bookings/manage/cancel][étape 6/6] email pro: ${proResult.status}${proResult.status === 'rejected' ? ' — ' + proResult.reason : ''}`);
    console.log(`[bookings/manage/cancel][étape 6/6] terminé (voir les logs [email] ci-dessus pour la réponse Resend complète de chaque envoi)`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[bookings/manage/cancel] EXCEPTION NON RATTRAPÉE — la requête va échouer avec une erreur 500:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
