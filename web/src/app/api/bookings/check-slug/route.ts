import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SLUG_REGEX } from '@/lib/booking';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get('slug') ?? '').trim().toLowerCase();
  console.log(`[bookings/check-slug] slug reçu: "${slug}"`);

  if (slug.length < 3 || slug.length > 50 || !SLUG_REGEX.test(slug)) {
    console.warn(`[bookings/check-slug] format invalide pour "${slug}"`);
    return NextResponse.json({ available: false, reason: 'invalid_format' });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('booking_settings')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    console.log(`[bookings/check-slug] réponse Supabase complète:`, JSON.stringify({ data, error }));

    if (error) throw error;

    return NextResponse.json({ available: !data });
  } catch (err) {
    console.error(`[bookings/check-slug] EXCEPTION pour slug="${slug}":`, JSON.stringify(err), err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
