import { Router } from 'express';
import type { Request, Response } from 'express';
import { stripe } from '../lib/stripe';
import { supabase } from '../lib/supabase';

export const webhooksRouter = Router();

// ─── Stripe Webhook ───────────────────────────────────────────────────────────

webhooksRouter.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) {
    res.status(400).send('Missing stripe-signature header');
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    res.status(400).send('Webhook signature verification failed');
    return;
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as {
          id: string;
          customer: string;
          status: string;
          metadata: Record<string, string>;
          trial_end: number | null;
          current_period_end: number;
        };
        const userId = sub.metadata.user_id;
        const planKey = sub.metadata.plan_key;

        if (userId) {
          await supabase.from('subscriptions').upsert(
            {
              user_id: userId,
              stripe_subscription_id: sub.id,
              stripe_customer_id: sub.customer,
              plan_key: planKey,
              status: sub.status,
              trial_end: sub.trial_end
                ? new Date(sub.trial_end * 1000).toISOString()
                : null,
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'stripe_subscription_id' }
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as { id: string };
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as { subscription: string };
        if (invoice.subscription) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', invoice.subscription);
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
    res.status(500).send('Webhook handler failed');
  }
});

// ─── PayPal Webhook ───────────────────────────────────────────────────────────

webhooksRouter.post('/paypal', async (req: Request, res: Response) => {
  // PayPal sends JSON (not raw body), so express.json() is applied normally
  const event = req.body as {
    event_type: string;
    resource: {
      id: string;
      status: string;
      plan_id: string;
      custom_id?: string;
    };
  };

  try {
    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.RENEWED': {
        const { id, status } = event.resource;
        await supabase
          .from('subscriptions')
          .update({
            status: status === 'ACTIVE' ? 'active' : 'trialing',
            updated_at: new Date().toISOString(),
          })
          .eq('paypal_subscription_id', id);
        break;
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED': {
        const { id } = event.resource;
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('paypal_subscription_id', id);
        break;
      }

      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
        const { id } = event.resource;
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('paypal_subscription_id', id);
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('PayPal webhook handler error:', err);
    res.status(500).send('PayPal webhook handler failed');
  }
});
