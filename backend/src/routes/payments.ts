import { Router } from 'express';
import { z } from 'zod';
import { stripe, PLANS } from '../lib/stripe';
import { createSubscription, getSubscriptionDetails, PAYPAL_PLAN_IDS } from '../lib/paypal';
import { supabase } from '../lib/supabase';
import type { AuthRequest } from '../middleware/requireAuth';

export const paymentsRouter = Router();

// ─── Stripe ──────────────────────────────────────────────────────────────────

const checkoutSchema = z.object({
  planKey: z.enum([
    'starter_individual',
    'starter_professional',
    'pro_individual',
    'pro_professional',
    'enterprise',
  ]),
  billing: z.enum(['monthly', 'annual']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  promoCode: z.string().max(20).optional(),
});

/** POST /api/payments/create-checkout — Stripe Checkout Session */
paymentsRouter.post('/create-checkout', async (req: AuthRequest, res, next) => {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid data', details: parsed.error.flatten() });
      return;
    }

    const { planKey, billing, successUrl, cancelUrl, promoCode } = parsed.data;
    const plan = PLANS[planKey];

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', req.userId)
      .single();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email ?? req.userEmail,
        metadata: { supabase_user_id: req.userId! },
      });
      customerId = customer.id;
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', req.userId);
    }

    // Validate and look up promo code referrer
    let referrerUserId: string | null = null;
    if (promoCode) {
      const { data: referrer } = await supabase
        .from('profiles')
        .select('id')
        .eq('promo_code', promoCode.toUpperCase().trim())
        .neq('id', req.userId)
        .single();
      if (referrer) referrerUserId = referrer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: plan[billing], quantity: 1 }],
      subscription_data: {
        trial_period_days: 3,
        metadata: {
          plan_key: planKey,
          user_id: req.userId!,
          promo_code: promoCode ?? '',
          referrer_user_id: referrerUserId ?? '',
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    // Record promo code use immediately (webhook will also do it, this is a fast path)
    if (referrerUserId && promoCode) {
      await supabase.from('promo_code_uses').insert({
        referrer_user_id: referrerUserId,
        subscriber_user_id: req.userId,
        promo_code: promoCode.toUpperCase().trim(),
      }).then(() => null).catch(() => null); // non-blocking, duplicate is fine
    }

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    next(err);
  }
});

/** POST /api/payments/create-portal — Customer billing portal */
paymentsRouter.post('/create-portal', async (req: AuthRequest, res, next) => {
  try {
    const { returnUrl } = req.body;
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', req.userId)
      .single();

    if (!profile?.stripe_customer_id) {
      res.status(404).json({ error: 'No billing account found' });
      return;
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// ─── PayPal ──────────────────────────────────────────────────────────────────

const paypalCheckoutSchema = z.object({
  planKey: z.enum([
    'starter_individual',
    'starter_professional',
    'pro_individual',
    'pro_professional',
    'enterprise',
  ]),
  billing: z.enum(['monthly', 'annual']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

/** POST /api/payments/create-paypal-subscription */
paymentsRouter.post('/create-paypal-subscription', async (req: AuthRequest, res, next) => {
  try {
    const parsed = paypalCheckoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid data', details: parsed.error.flatten() });
      return;
    }

    const { planKey, billing, successUrl, cancelUrl } = parsed.data;

    // PayPal has separate plans for monthly/annual
    const paypalKey = billing === 'annual' ? `${planKey}_annual` : planKey;
    const paypalPlanId = PAYPAL_PLAN_IDS[paypalKey] ?? PAYPAL_PLAN_IDS[planKey];

    if (!paypalPlanId) {
      res.status(400).json({ error: `No PayPal plan configured for: ${paypalKey}` });
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', req.userId)
      .single();

    const subscription = await createSubscription({
      planId: paypalPlanId,
      returnUrl: successUrl,
      cancelUrl: cancelUrl,
      subscriberEmail: profile?.email ?? req.userEmail,
    });

    // Store pending PayPal subscription
    await supabase.from('subscriptions').upsert({
      user_id: req.userId,
      stripe_subscription_id: null,
      plan_key: planKey,
      status: 'pending_paypal',
      paypal_subscription_id: subscription.id,
      updated_at: new Date().toISOString(),
    });

    res.json({ approveUrl: subscription.approveUrl, subscriptionId: subscription.id });
  } catch (err) {
    next(err);
  }
});

/** GET /api/payments/paypal-success?subscription_id=... */
paymentsRouter.get('/paypal-success', async (req: AuthRequest, res, next) => {
  try {
    const { subscription_id } = req.query as { subscription_id?: string };
    if (!subscription_id) {
      res.status(400).json({ error: 'Missing subscription_id' });
      return;
    }

    const details = await getSubscriptionDetails(subscription_id) as {
      status: string;
      plan_id: string;
    };

    if (details.status === 'ACTIVE') {
      await supabase
        .from('subscriptions')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('paypal_subscription_id', subscription_id);
    }

    res.json({ status: details.status, activated: details.status === 'ACTIVE' });
  } catch (err) {
    next(err);
  }
});

/** POST /api/payments/activate-free-enterprise — bypass for promo code VELONA237 */
paymentsRouter.post('/activate-free-enterprise', async (req: AuthRequest, res, next) => {
  try {
    const { promoCode } = req.body as { promoCode?: string };

    if (promoCode?.toUpperCase().trim() !== 'VELONA237') {
      res.status(400).json({ error: 'Invalid promo code' });
      return;
    }

    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Write subscription directly — no Stripe, no card
    await supabase.from('subscriptions').upsert({
      user_id: req.userId,
      plan_key: 'enterprise',
      status: 'active',
      current_period_end: '2099-12-31 23:59:59+00',
      stripe_subscription_id: 'promo_velona237',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    // Denormalize onto profile so dashboard reads it immediately
    await supabase.from('profiles')
      .update({ plan_key: 'enterprise', updated_at: new Date().toISOString() })
      .eq('id', req.userId);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/** GET /api/payments/subscription — current user's active subscription */
paymentsRouter.get('/subscription', async (req: AuthRequest, res, next) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.userId)
      .in('status', ['trialing', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      res.json(null);
      return;
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});
