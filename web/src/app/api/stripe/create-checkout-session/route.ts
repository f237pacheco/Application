import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_IDS: Record<string, { monthly: string; annual: string }> = {
  starter_individual: {
    monthly: process.env.STRIPE_STARTER_INDIVIDUAL_MONTHLY_PRICE_ID!,
    annual:  process.env.STRIPE_STARTER_INDIVIDUAL_ANNUAL_PRICE_ID!,
  },
  starter_professional: {
    monthly: process.env.STRIPE_STARTER_PROFESSIONAL_MONTHLY_PRICE_ID!,
    annual:  process.env.STRIPE_STARTER_PROFESSIONAL_ANNUAL_PRICE_ID!,
  },
  pro_individual: {
    monthly: process.env.STRIPE_PRO_INDIVIDUAL_MONTHLY_PRICE_ID!,
    annual:  process.env.STRIPE_PRO_INDIVIDUAL_ANNUAL_PRICE_ID!,
  },
  pro_professional: {
    monthly: process.env.STRIPE_PRO_PROFESSIONAL_MONTHLY_PRICE_ID!,
    annual:  process.env.STRIPE_PRO_PROFESSIONAL_ANNUAL_PRICE_ID!,
  },
  enterprise: {
    monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID!,
    annual:  process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID!,
  },
};

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

    const { planKey, billing, successUrl, cancelUrl, promoCode } = await request.json() as {
      planKey: string;
      billing: 'monthly' | 'annual';
      successUrl: string;
      cancelUrl: string;
      promoCode?: string;
    };

    const priceIds = PRICE_IDS[planKey];
    if (!priceIds) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

    const priceId = billing === 'annual' ? priceIds.annual : priceIds.monthly;
    if (!priceId) return NextResponse.json({ error: 'Price not configured' }, { status: 500 });

    // Get or create Stripe customer tied to this user
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, first_name')
      .eq('id', user.id)
      .single();

    let customerId: string | undefined = profile?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email ?? user.email ?? undefined,
        name: profile?.first_name ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 3,
        metadata: { supabase_user_id: user.id, plan_key: planKey, billing },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: { supabase_user_id: user.id, plan_key: planKey, billing },
    };

    if (promoCode) {
      const coupons = await stripe.promotionCodes.list({ code: promoCode, active: true, limit: 1 });
      if (coupons.data.length > 0) {
        sessionParams.discounts = [{ promotion_code: coupons.data[0].id }];
        delete sessionParams.allow_promotion_codes;
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[stripe/create-checkout-session]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
