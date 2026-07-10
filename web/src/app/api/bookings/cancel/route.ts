import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { sendBookingCancellationToClient } from '@/lib/email';

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
      .select('id, client_name, client_email, booking_date, booking_time, status')
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!booking) return NextResponse.json({ error: 'RDV introuvable' }, { status: 404 });
    if (booking.status === 'cancelled') return NextResponse.json({ success: true });

    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    const [{ data: settings }, { data: profile }] = await Promise.all([
      supabase.from('booking_settings').select('business_name, address, phone, logo_url').eq('user_id', user.id).maybeSingle(),
      supabase.from('profiles').select('email').eq('id', user.id).maybeSingle(),
    ]);

    await sendBookingCancellationToClient({
      clientName: booking.client_name,
      clientEmail: booking.client_email,
      businessName: settings?.business_name ?? 'votre prestataire',
      businessAddress: settings?.address ?? undefined,
      businessPhone: settings?.phone ?? undefined,
      businessLogoUrl: settings?.logo_url ?? undefined,
      date: booking.booking_date,
      time: booking.booking_time,
      proEmail: profile?.email ?? undefined,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[bookings/cancel]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
