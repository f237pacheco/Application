import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export const PLANS = {
  starter_individual: {
    monthly: process.env.STRIPE_STARTER_INDIVIDUAL_MONTHLY_PRICE_ID!,
    annual: process.env.STRIPE_STARTER_INDIVIDUAL_ANNUAL_PRICE_ID!,
    amount: { monthly: 2900, annual: 27840 }, // cents
  },
  starter_professional: {
    monthly: process.env.STRIPE_STARTER_PROFESSIONAL_MONTHLY_PRICE_ID!,
    annual: process.env.STRIPE_STARTER_PROFESSIONAL_ANNUAL_PRICE_ID!,
    amount: { monthly: 4900, annual: 47040 },
  },
  pro_individual: {
    monthly: process.env.STRIPE_PRO_INDIVIDUAL_MONTHLY_PRICE_ID!,
    annual: process.env.STRIPE_PRO_INDIVIDUAL_ANNUAL_PRICE_ID!,
    amount: { monthly: 7900, annual: 75840 },
  },
  pro_professional: {
    monthly: process.env.STRIPE_PRO_PROFESSIONAL_MONTHLY_PRICE_ID!,
    annual: process.env.STRIPE_PRO_PROFESSIONAL_ANNUAL_PRICE_ID!,
    amount: { monthly: 12900, annual: 123840 },
  },
  enterprise: {
    monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID!,
    annual: process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID!,
    amount: { monthly: 29900, annual: 287040 },
  },
} as const;
