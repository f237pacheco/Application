import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SLUG_REGEX } from '@/lib/booking';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get('slug') ?? '').trim().toLowerCase();

  if (slug.length < 3 || slug.length > 50 || !SLUG_REGEX.test(slug)) {
    return NextResponse.json({ available: false, reason: 'invalid_format' });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('booking_settings')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ available: !data });
  } catch (err) {
    console.error('[bookings/check-slug]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
