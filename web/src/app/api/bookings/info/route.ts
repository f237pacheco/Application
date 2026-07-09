import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawSlug = searchParams.get('slug') ?? '';
  const slug = rawSlug.trim().toLowerCase();

  console.log(`[bookings/info] slug reçu (brut): "${rawSlug}" → normalisé: "${slug}"`);

  if (!slug) {
    console.warn('[bookings/info] slug vide après normalisation — 400');
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    console.log(`[bookings/info] requête Supabase: SELECT ... FROM booking_settings WHERE slug = '${slug}'`);
    const { data: settings, error } = await supabase
      .from('booking_settings')
      .select('business_name, description, address, phone, logo_url, services, instructions, payment_methods, slot_duration, advance_booking_days')
      .eq('slug', slug)
      .maybeSingle();

    console.log(`[bookings/info] réponse Supabase complète:`, JSON.stringify({ data: settings, error }));

    if (error) throw error;
    if (!settings) {
      console.warn(`[bookings/info] AUCUNE ligne booking_settings trouvée pour slug="${slug}" (data=null, pas d'erreur Supabase) — 404`);
      return NextResponse.json({ error: 'Page de réservation introuvable' }, { status: 404 });
    }

    console.log(`[bookings/info] ligne trouvée pour slug="${slug}", business_name="${settings.business_name}"`);

    return NextResponse.json({
      businessName: settings.business_name,
      description: settings.description,
      address: settings.address,
      phone: settings.phone,
      logoUrl: settings.logo_url,
      services: settings.services,
      instructions: settings.instructions,
      paymentMethods: settings.payment_methods,
      slotDuration: settings.slot_duration,
      advanceBookingDays: settings.advance_booking_days,
    });
  } catch (err) {
    console.error(`[bookings/info] EXCEPTION pour slug="${slug}":`, JSON.stringify(err), err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
