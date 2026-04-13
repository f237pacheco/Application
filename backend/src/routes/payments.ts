import { Router } from 'express';
import { z } from 'zod';
import { stripe, PLANS } from '../lib/stripe';
import { supabase } from '../lib/supabase';
import type { AuthRequest } from '../middleware/requireAuth';

export const paymentsRouter = Router();

const checkoutSchema = z.object({
  planKey: z.enum(['starter_individual', 'starter_professional', 'pro_individual', 'pro_professional', 'enterprise']),
  billing: z.enum(['monthly', 'annual']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

// POST /api/payments/create-checkout — create Stripe checkout session
paymentsRouter.post('/create-checkout', async (req: AuthRequest, res, next) => {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid data', details: parsed.error.flatten() });
      return;
    }

    const { planKey, billing, successUrl, cancelUrl } = parsed.data;
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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: plan[billing], quantity: 1 }],
      subscription_data: {
        trial_period_days: 3,
        metadata: { plan_key: planKey, user_id: req.userId! },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/create-portal — customer billing portal
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
