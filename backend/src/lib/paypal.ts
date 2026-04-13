const BASE_URL = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error(`PayPal auth failed: ${res.status}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export interface CreateSubscriptionParams {
  planId: string;    // PayPal plan ID from dashboard
  returnUrl: string;
  cancelUrl: string;
  subscriberEmail?: string;
}

export interface PayPalSubscription {
  id: string;
  status: string;
  approveUrl: string;
}

export async function createSubscription(
  params: CreateSubscriptionParams
): Promise<PayPalSubscription> {
  const token = await getAccessToken();

  const body = {
    plan_id: params.planId,
    subscriber: params.subscriberEmail
      ? { email_address: params.subscriberEmail }
      : undefined,
    application_context: {
      return_url: params.returnUrl,
      cancel_url: params.cancelUrl,
      brand_name: 'Velona',
      locale: 'fr-FR',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'SUBSCRIBE_NOW',
    },
  };

  const res = await fetch(`${BASE_URL}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal subscription creation failed: ${err}`);
  }

  const data = (await res.json()) as {
    id: string;
    status: string;
    links: { rel: string; href: string }[];
  };

  const approveLink = data.links.find((l) => l.rel === 'approve');
  if (!approveLink) throw new Error('No PayPal approve URL in response');

  return {
    id: data.id,
    status: data.status,
    approveUrl: approveLink.href,
  };
}

export async function getSubscriptionDetails(subscriptionId: string) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to get PayPal subscription');
  return res.json();
}

/** Map our plan keys to PayPal plan IDs from env */
export const PAYPAL_PLAN_IDS: Record<string, string> = {
  starter_individual: process.env.PAYPAL_PLAN_STARTER_INDIVIDUAL ?? '',
  starter_professional: process.env.PAYPAL_PLAN_STARTER_PROFESSIONAL ?? '',
  pro_individual: process.env.PAYPAL_PLAN_PRO_INDIVIDUAL ?? '',
  pro_professional: process.env.PAYPAL_PLAN_PRO_PROFESSIONAL ?? '',
  enterprise: process.env.PAYPAL_PLAN_ENTERPRISE ?? '',
};
