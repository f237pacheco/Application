import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

    const { bookingId } = await request.json() as { bookingId?: string };
    if (!bookingId) return NextResponse.json({ error: 'bookingId requis' }, { status: 400 });

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!booking) return NextResponse.json({ error: 'RDV introuvable' }, { status: 404 });
    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Un rendez-vous annulé ne peut pas être marqué comme terminé.' }, { status: 409 });
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', bookingId)
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    console.log(`[bookings/complete] réservation ${bookingId} marquée comme terminée`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[bookings/complete]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
