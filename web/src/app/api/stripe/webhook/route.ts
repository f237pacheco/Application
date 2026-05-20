import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Service role bypasses RLS — only used server-side in this webhook handler
function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function upsertSubscription(
  supabase: ReturnType<typeof getServiceSupabase>,
  sub: Stripe.Subscription
) {
  const userId: string | undefined =
    (sub.metadata?.supabase_user_id as string) ||
    ((sub as unknown as { customer_details?: { metadata?: { supabase_user_id?: string } } })
      .customer_details?.metadata?.supabase_user_id);

  if (!userId) {
    // Try to look up user via stripe_customer_id on profiles
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();
    if (!profile) return;

    await supabase.from('subscriptions').upsert(
      {
        user_id: profile.id,
        stripe_subscription_id: sub.id,
        stripe_customer_id: customerId,
        plan_key: (sub.metadata?.plan_key as string) ?? 'starter_individual',
        billing: (sub.metadata?.billing as string) ?? 'monthly',
        status: sub.status,
        trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
        current_period_end: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'stripe_subscription_id' }
    );

    // Sync plan_key to profiles
    await supabase
      .from('profiles')
      .update({ plan_key: (sub.metadata?.plan_key as string) ?? 'starter_individual' })
      .eq('id', profile.id);
    return;
  }

  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_subscription_id: sub.id,
      stripe_customer_id: customerId,
      plan_key: (sub.metadata?.plan_key as string) ?? 'starter_individual',
      billing: (sub.metadata?.billing as string) ?? 'monthly',
      status: sub.status,
      trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      current_period_end: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_subscription_id' }
  );

  // Sync plan_key to profiles
  if (sub.status === 'active' || sub.status === 'trialing') {
    await supabase
      .from('profiles')
      .update({ plan_key: (sub.metadata?.plan_key as string) ?? 'starter_individual' })
      .eq('id', userId);
  } else if (sub.status === 'canceled') {
    await supabase.from('profiles').update({ plan_key: null }).eq('id', userId);
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const subId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          // Merge session metadata into subscription for user lookup
          if (session.metadata?.supabase_user_id && !sub.metadata?.supabase_user_id) {
            await stripe.subscriptions.update(subId, {
              metadata: {
                ...sub.metadata,
                supabase_user_id: session.metadata.supabase_user_id,
                plan_key: session.metadata.plan_key ?? '',
                billing: session.metadata.billing ?? 'monthly',
              },
            });
            sub.metadata = {
              ...sub.metadata,
              supabase_user_id: session.metadata.supabase_user_id,
              plan_key: session.metadata.plan_key ?? '',
              billing: session.metadata.billing ?? 'monthly',
            };
          }
          await upsertSubscription(supabase, sub);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscription(supabase, sub);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        // Mark as canceled in DB
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id);

        // Clear plan_key from profile
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();
        if (profile) {
          await supabase.from('profiles').update({ plan_key: null }).eq('id', profile.id);
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('[stripe/webhook] event handling error', err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
